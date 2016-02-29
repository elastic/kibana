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
      .findByCssSelector('a.navbar-timepicker-time-desc pretty-duration.ng-isolate-scope')
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
        common.sleep(1000);
      })
      .then(function () {
        common.debug('--saveSearch button clicked');
        return thisTime.findById('SaveSearch')
        .type(searchName);
      })
      .then(function clickSave() {
        common.debug('--find save button');
        return thisTime
        .findByCssSelector('button[ng-disabled="!opts.savedSearch.title"]')
        .click();
      });
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

    clickLoadSavedSearchButton: function clickSaveSearchButton() {
      return thisTime
      .findByCssSelector('button[aria-label="Load Saved Search"]')
      .click();
    },

    getCurrentQueryName: function getCurrentQueryName() {
      return common.tryForTime(defaultTimeout, function () {
        return thisTime
        .findByCssSelector('span.discover-info-title')
        .getVisibleText();
      });
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
      .findByCssSelector('span.results-interval:nth-child(2) > a:nth-child(1)')
      .getVisibleText();
    },

    setChartInterval: function setChartInterval(interval) {
      return thisTime
      .findByCssSelector('span.results-interval:nth-child(2) > a:nth-child(1)')
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
      .findByCssSelector('button.clipboard-button')
      .click();
    },

    getShareCaption: function getShareCaption() {
      return thisTime
      .findByCssSelector('div.form-group > label')
      .getVisibleText();
    },

    getSharedUrl: function getSharedUrl() {
      return thisTime
      .findByCssSelector('.url')
      .getProperty('baseURI');
    },

    getShortenedUrl: function getShortenedUrl() {
      return thisTime
      .findByCssSelector('.url')
      .getProperty('value');
    },

    clickLegendExpand: function clickLegendExpand() {
      return thisTime
      .findByCssSelector('.fa-chevron-left')
      .click();
    },

    clickLegendCollapse: function clickLegendCollapse() {
      return thisTime
      .findByCssSelector('div.legend-toggle > i.fa-chevron-right')
      .click();
    },

    getLegendWidth: function getLegendWidth() {
      return thisTime
      .findByCssSelector('.legend-col-wrapper')
      .getProperty('clientWidth');
    },

    clickSidebarExpand: function clickSidebarExpand() {
      return thisTime
      .findByCssSelector('.chevron-cont')
      .click();
    },

    clickSidebarCollapse: function clickSidebarCollapse() {
      return thisTime
      .findByCssSelector('.chevron-cont')
      .click();
    },

    getSidebarWidth: function getSidebarWidth() {
      return thisTime
      .findByCssSelector('.sidebar-list')
      .getProperty('clientWidth');
    }

  };

  return DiscoverPage;
});
