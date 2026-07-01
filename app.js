(function () {
  "use strict";

  var STORAGE_KEY = "kcal-tracker-data";
  var MEALS = ["frokost", "lunsj", "middag", "div"];
  var DAY_NAMES = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
  var MONTH_SHORT = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

  // ---------- date helpers ----------
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function isoDate(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseIsoDate(str) {
    var parts = str.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function getMonday(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = d.getDay(); // 0 = sunday
    var diff = day === 0 ? -6 : 1 - day;
    return addDays(d, diff);
  }

  function formatShort(date) {
    return date.getDate() + ". " + MONTH_SHORT[date.getMonth()];
  }

  function weekRangeLabel(monday) {
    var sunday = addDays(monday, 6);
    if (monday.getMonth() === sunday.getMonth()) {
      return monday.getDate() + ".–" + sunday.getDate() + ". " + MONTH_SHORT[sunday.getMonth()] + " " + sunday.getFullYear();
    }
    return formatShort(monday) + " – " + formatShort(sunday) + " " + sunday.getFullYear();
  }

  // ---------- data ----------
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  var data = loadData();

  function mealSum(entry) {
    if (!entry) return 0;
    var sum = 0;
    for (var i = 0; i < MEALS.length; i++) {
      sum += Number(entry[MEALS[i]]) || 0;
    }
    return sum;
  }

  function setMealValue(dateKey, meal, rawValue) {
    var entry = data[dateKey] || {};
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      delete entry[meal];
    } else {
      var num = parseFloat(rawValue);
      if (isNaN(num) || num < 0) {
        delete entry[meal];
      } else {
        entry[meal] = num;
      }
    }
    if (Object.keys(entry).length === 0) {
      delete data[dateKey];
    } else {
      data[dateKey] = entry;
    }
    saveData();
  }

  // ---------- state ----------
  var currentMonday = getMonday(new Date());

  // ---------- dom refs ----------
  var tabRegistrer = document.getElementById("tab-registrer");
  var tabHistorikk = document.getElementById("tab-historikk");
  var viewRegistrer = document.getElementById("view-registrer");
  var viewHistorikk = document.getElementById("view-historikk");
  var weekLabelEl = document.getElementById("week-label");
  var dayCardsEl = document.getElementById("day-cards");
  var weekTotalEl = document.getElementById("week-total");
  var historyListEl = document.getElementById("history-list");
  var template = document.getElementById("day-card-template");

  // ---------- rendering ----------
  function renderEditor() {
    weekLabelEl.textContent = weekRangeLabel(currentMonday);
    dayCardsEl.innerHTML = "";

    var todayKey = isoDate(new Date());
    var weekTotal = 0;

    for (let i = 0; i < 7; i++) {
      let date = addDays(currentMonday, i);
      let key = isoDate(date);
      let entry = data[key] || {};

      let node = template.content.cloneNode(true);
      let card = node.querySelector(".day-card");
      if (key === todayKey) card.classList.add("is-today");

      node.querySelector(".day-name").textContent = DAY_NAMES[i];
      node.querySelector(".day-date").textContent = formatShort(date);

      let sumEl = node.querySelector(".day-sum");

      let inputs = node.querySelectorAll("input[data-meal]");
      inputs.forEach(function (input) {
        let meal = input.getAttribute("data-meal");
        let value = entry[meal];
        input.value = (value === undefined || value === null) ? "" : value;

        input.addEventListener("input", function () {
          setMealValue(key, meal, input.value);
          var updatedEntry = data[key] || {};
          var daySum = mealSum(updatedEntry);
          sumEl.textContent = daySum;
          updateWeekTotal();
        });
      });

      sumEl.textContent = mealSum(entry);
      weekTotal += mealSum(entry);

      dayCardsEl.appendChild(node);
    }

    weekTotalEl.textContent = weekTotal;
  }

  function updateWeekTotal() {
    var total = 0;
    for (var i = 0; i < 7; i++) {
      var key = isoDate(addDays(currentMonday, i));
      total += mealSum(data[key]);
    }
    weekTotalEl.textContent = total;
  }

  function renderHistory() {
    historyListEl.innerHTML = "";

    var weekTotals = {};
    Object.keys(data).forEach(function (dateKey) {
      var monday = getMonday(parseIsoDate(dateKey));
      var mondayKey = isoDate(monday);
      var sum = mealSum(data[dateKey]);
      weekTotals[mondayKey] = (weekTotals[mondayKey] || 0) + sum;
    });

    var weekKeys = Object.keys(weekTotals).sort(function (a, b) {
      return a < b ? 1 : a > b ? -1 : 0;
    });

    if (weekKeys.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Ingen registreringer ennå. Fyll inn måltider under «Registrer» for å se historikk her.";
      historyListEl.appendChild(empty);
      return;
    }

    weekKeys.forEach(function (weekKey) {
      var monday = parseIsoDate(weekKey);
      var row = document.createElement("div");
      row.className = "history-row";

      var rangeWrap = document.createElement("div");
      rangeWrap.className = "history-range";

      var rangeLabel = document.createElement("span");
      rangeLabel.className = "range-label";
      rangeLabel.textContent = weekRangeLabel(monday);

      var rangeSub = document.createElement("span");
      rangeSub.className = "range-sub";
      rangeSub.textContent = "Trykk for å åpne uken";

      rangeWrap.appendChild(rangeLabel);
      rangeWrap.appendChild(rangeSub);

      var totalEl = document.createElement("span");
      totalEl.className = "history-total";
      totalEl.textContent = weekTotals[weekKey] + " kcal";

      row.appendChild(rangeWrap);
      row.appendChild(totalEl);

      row.addEventListener("click", function () {
        currentMonday = monday;
        renderEditor();
        switchTab("registrer");
      });

      historyListEl.appendChild(row);
    });
  }

  function switchTab(name) {
    var isRegistrer = name === "registrer";
    tabRegistrer.classList.toggle("active", isRegistrer);
    tabHistorikk.classList.toggle("active", !isRegistrer);
    viewRegistrer.classList.toggle("hidden", !isRegistrer);
    viewHistorikk.classList.toggle("hidden", isRegistrer);
    if (!isRegistrer) renderHistory();
  }

  // ---------- events ----------
  document.getElementById("prev-week").addEventListener("click", function () {
    currentMonday = addDays(currentMonday, -7);
    renderEditor();
  });

  document.getElementById("next-week").addEventListener("click", function () {
    currentMonday = addDays(currentMonday, 7);
    renderEditor();
  });

  document.getElementById("go-today").addEventListener("click", function () {
    currentMonday = getMonday(new Date());
    renderEditor();
  });

  tabRegistrer.addEventListener("click", function () { switchTab("registrer"); });
  tabHistorikk.addEventListener("click", function () { switchTab("historikk"); });

  // ---------- init ----------
  renderEditor();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
