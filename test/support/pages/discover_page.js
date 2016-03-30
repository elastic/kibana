// in test/support/pages/discover_page.js
define(function (require) {
  var config = require('intern').config;
  var Common = require('./common');

  var defaultTimeout = config.timeouts.default;
  var common;
  var thisTime;

  function DiscoverPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
    thisTime = this.remote.setFindTimeout(defaultTimeout);
  }

  DiscoverPage.prototype = {
    constructor: DiscoverPage,

    getQueryField: function getQueryField() {
      return thisTime
      .findByCssSelector('input[ng-model=\'state.query\']');
    },

    getQuerySearchButton: function getQuerySearchButton() {
      return thisTime
      .findByCssSelector('button[aria-label=\'Search\']');
    },

    getTimespanText: function getTimespanText() {
      return thisTime
      .findByCssSelector('.kibana-nav-options .navbar-timepicker-time-desc pretty-duration')
      .getVisibleText();
    },

    getChartTimespan: function getChartTimespan() {
      return thisTime
      .findByCssSelector('center.small > span:nth-child(1)')
      .getVisibleText();
    },

    saveSearch: function saveSearch(searchName) {
      var self = this;
      return self.clickSaveSearchButton()
      .then(function () {
        common.debug('--saveSearch button clicked');
        return thisTime.findDisplayedById('SaveSearch')
        .pressKeys(searchName);
      })
      .then(function clickSave() {
        common.debug('--find save button');
        return common.findTestSubject('discover-save-search-btn').click();
      })
      .catch(common.handleError(this));
    },

    loadSavedSearch: function loadSavedSearch(searchName) {
      var self = this;
      return self.clickLoadSavedSearchButton()
      .then(function () {
        thisTime.findByLinkText(searchName).click();
      });
    },

    clickNewSearchButton: function clickNewSearchButton() {
      return thisTime
      .findByCssSelector('button[aria-label="New Search"]')
      .click();
    },
    clickSaveSearchButton: function clickSaveSearchButton() {
      return thisTime
      .findByCssSelector('button[aria-label="Save Search"]')
      .click();
    },

    clickLoadSavedSearchButton: function clickLoadSavedSearchButton() {
      return thisTime
      .findDisplayedByCssSelector('button[aria-label="Load Saved Search"]')
      .click();
    },

    getCurrentQueryName: function getCurrentQueryName() {
      return thisTime
        .findByCssSelector('span.kibana-nav-info-title span')
        .getVisibleText();
    },

    getBarChartData: function getBarChartData() {
      return thisTime
      .findAllByCssSelector('rect[data-label="Count"]')
      .then(function (chartData) {

        function getChartData(chart) {
          return chart
          .getAttribute('height');
        }

        var getChartDataPromises = chartData.map(getChartData);
        return Promise.all(getChartDataPromises);
      })
      .then(function (bars) {
        return bars;
      });
    },

    getChartInterval: function getChartInterval() {
      return thisTime
      .findByCssSelector('a[ng-click="toggleInterval()"]')
      .getVisibleText();
    },

    setChartInterval: function setChartInterval(interval) {
      return this.remote.setFindTimeout(5000)
      .findByCssSelector('a[ng-click="toggleInterval()"]')
      .click()
      .catch(function () {
        // in some cases we have the link above, but after we've made a
        // selection we just have a select list.
      })
      .then(function () {
        return thisTime
        .findByCssSelector('option[label="' + interval + '"]')
        .click();
      });
    },

    getHitCount: function getHitCount() {
      return thisTime
      .findByCssSelector('strong.discover-info-hits')
      .getVisibleText();
    },

    query: function query(queryString) {
      return thisTime
      .findByCssSelector('input[aria-label="Search input"]')
      .clearValue()
      .type(queryString)
      .then(function () {
        return thisTime
        .findByCssSelector('button[aria-label="Search"]')
        .click();
      });
    },

    getDocHeader: function getDocHeader() {
      return thisTime
      .findByCssSelector('thead.ng-isolate-scope > tr:nth-child(1)')
      .getVisibleText();
    },

    getDocTableIndex: function getDocTableIndex(index) {
      return thisTime
      .findByCssSelector('tr.discover-table-row:nth-child(' + (index) + ')')
      .getVisibleText();
    },

    clickDocSortDown: function clickDocSortDown() {
      return thisTime
      .findByCssSelector('.fa-sort-down')
      .click();
    },

    clickDocSortUp: function clickDocSortUp() {
      return thisTime
      .findByCssSelector('.fa-sort-up')
      .click();
    },

    getMarks: function getMarks() {
      return thisTime
      .findAllByCssSelector('mark')
      .getVisibleText();
    },

    clickShare: function clickShare() {
      return thisTime
      .findByCssSelector('button[aria-label="Share Search"]')
      .click();
    },

    clickShortenUrl: function clickShortenUrl() {
      return thisTime
      .findByCssSelector('button.shorten-button')
      .click();
    },

    clickCopyToClipboard: function clickCopyToClipboard() {
      return thisTime
      .findDisplayedByCssSelector('button.clipboard-button')
      .click();
    },

    getShareCaption: function getShareCaption() {
      return thisTime
      .findByCssSelector('.vis-share label')
      .getVisibleText();
    },

    getSharedUrl: function getSharedUrl() {
      return thisTime
      .findByCssSelector('.url')
      .getProperty('value');
    },

    getShortenedUrl: function getShortenedUrl() {
      return thisTime
      .findByCssSelector('.url')
      .getProperty('value');
    },

    toggleSidebarCollapse: function toggleSidebarCollapse() {
      return thisTime.findDisplayedByCssSelector('.sidebar-collapser .chevron-cont')
        .click();
    },

    getSidebarWidth: function getSidebarWidth() {
      return thisTime
        .findByClassName('sidebar-list')
        .getProperty('clientWidth');
    }

  };

  return DiscoverPage;
});
