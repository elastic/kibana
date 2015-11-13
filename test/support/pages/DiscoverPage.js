// in test/support/pages/DiscoverPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  var Common = require('./Common');

  var defaultTimeout = 20000;
  var common;
  var thisTime;

  function DiscoverPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
    thisTime = this.remote.setFindTimeout(defaultTimeout);
  }

  DiscoverPage.prototype = {
    constructor: DiscoverPage,

    clickTimepicker: function clickTimepicker() {
      return thisTime.findByClassName('navbar-timepicker-time-desc').click();
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return thisTime.findByCssSelector('a[ng-click="setMode(\'absolute\')"').click();
    },

    setFromTime: function setFromTime(timeString) {
      return thisTime.findByCssSelector('input[ng-model=\'absolute.from\']')
      .type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
    },

    setToTime: function setToTime(timeString) {
      return thisTime
      .findByCssSelector('input[ng-model=\'absolute.to\']')
      .type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
          '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
    },

    clickGoButton: function clickGoButton() {
      return thisTime
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
      return thisTime
      .findByCssSelector('.fa.fa-chevron-up')
      .click();
    },

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

    saveSearch: function saveSearch(searchName) {
      var self = this;
      return self.clickSaveSearchButton()
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

    getToastMessage: function getToastMessage() {
      return thisTime
      .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
      .getVisibleText();
    },

    waitForToastMessageGone: function waitForToastMessageGone() {
      var self = this;
      return common.tryForTime(defaultTimeout * 5, function tryingForTime() {
        return self.remote.setFindTimeout(1000)
        .findAllByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .then(function toastMessage(messages) {
          if (messages.length > 0) {
            throw new Error('waiting for toast message to clear');
          } else {
            common.debug('now messages = 0 "' + messages + '"');
            return messages;
          }
        });
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
      return thisTime
      .findByCssSelector('span.discover-info-title')
      // .findByCssSelector('span[bo-bind="opts.savedSearch.title"]')
      .getVisibleText();
    },

    getBarChartData: function getBarChartData() {
      // var barMap = {};
      var barArray = [];
      common.log('in getBarChartData');
      return thisTime
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
                common.debug(': ' + height + ', ');
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
      return thisTime.findByCssSelector('span.spinner.ng-hide');
    }

  };

  return DiscoverPage;
});
