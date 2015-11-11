// in test/support/pages/DiscoverPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  var Common = require('./Common');

  var defaultTimeout = 5000;
  var common;

  function DiscoverPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
  }

  DiscoverPage.prototype = {
    constructor: DiscoverPage,

    clickTimepicker: function clickTimepicker() {
      return this.remote.setFindTimeout(defaultTimeout * 3)
      .findByClassName('navbar-timepicker-time-desc')
      .click();
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('a[ng-click="setMode(\'absolute\')"')
      .click();
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('input[ng-model=\'absolute.from\']')
      .type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
    },

    setToTime: function setToTime(timeString) {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
    },

    clickGoButton: function clickGoButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByClassName('kbn-timepicker-go')
      .click();
    },


    setAbsoluteRange: function setAbsoluteRange(fromTime, toTime) {
      var self = this;
      common.debug('--Clicking Absolute button');
      return self.clickAbsoluteButton()
      .then(function () {
        common.debug('--Setting From Time : ' + fromTime);
        return self.setFromTime(fromTime);
      })
      .then(function () {
        common.debug('--Setting To Time : ' + toTime);
        return self.setToTime(toTime);
      })
      .then(function () {
        return self.clickGoButton();
      });
    },

    collapseTimepicker: function collapseTimepicker() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.fa.fa-chevron-up')
      .click();
    },

    getQueryField: function getQueryField() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('input[ng-model=\'state.query\']');
    },

    getQuerySearchButton: function getQuerySearchButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button[aria-label=\'Search\']');
    },

    getTimespanText: function getTimespanText() {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('a.navbar-timepicker-time-desc pretty-duration.ng-isolate-scope')
      .getVisibleText();
    },

    saveSearch: function saveSearch(searchName) {
      var self = this;
      return self
      .clickSaveSearchButton()
      .then(function () {
        common.debug('--saveSearch button clicked');
        return self.remote.setFindTimeout(defaultTimeout)
        .findById('SaveSearch')
        .type(searchName);
      })
      //   // click save button
      .then(function clickSave() {
        common.debug('--find save button');
        return self.remote.setFindTimeout(defaultTimeout)
        .findByCssSelector('button[ng-disabled="!opts.savedSearch.title"]')
        .click();
      });
    },

    clickNewSearchButton: function clickNewSearchButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button[aria-label="New Search"]')
      .click();
    },
    clickSaveSearchButton: function clickSaveSearchButton() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button[aria-label="Save Search"]')
      .click();
    },

    getCurrentQueryName: function getCurrentQueryName() {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('span.discover-info-title')
      // .findByCssSelector('span[bo-bind="opts.savedSearch.title"]')
      .getVisibleText();
    },

    getBarChartData: function getBarChartData() {
      // var barMap = {};
      var barArray = [];
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findAllByCssSelector('rect')
      .then(function (chartData) {

        function getChartData(chart) {
          return chart.getAttribute('fill')
          .then(function (fillColor) {
            // we're only getting the Green Bars
            if (fillColor === '#57c17b') {
              return chart
              .getAttribute('height')
              .then(function (height) {
                // common.debug(': ' + height + ', ');
                barArray.push(height);
              });
            }
          });
        }

        var getChartDataPromises = chartData.map(getChartData);
        return Promise.all(getChartDataPromises);
      })
      .then(function () {
        return barArray;
      });
    },

    getSpinnerDone: function getSpinnerDone() {
      common.debug('--getSpinner done method');
      return this.remote.setFindTimeout(defaultTimeout * 3)
      .findByCssSelector('span.spinner.ng-hide');
    }




  };

  return DiscoverPage;
});
