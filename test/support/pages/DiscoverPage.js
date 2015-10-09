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
      return this.remote
        .setFindTimeout(defaultTimeout * 3)
        .findByClassName('navbar-timepicker-time-desc')
        .then(function (picker) {
          return picker.click();
        });
    },

    clickAbsoluteButton: function clickAbsoluteButton() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('a[ng-click="setMode(\'absolute\')"')
        .then(function (picker) {
          return picker.click();
        });
    },

    setFromTime: function setFromTime(timeString) {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('input[ng-model=\'absolute.from\']')
        .then(function (picker) {
          // first delete the existing date
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    setToTime: function setToTime(timeString) {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('input[ng-model=\'absolute.to\']')
        .then(function (picker) {
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    clickGoButton: function clickGoButton() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByClassName('kbn-timepicker-go')
        .then(function (button) {
          return button.click();
        });
    },


    setAbsoluteRange: function setAbsoluteRange(fromTime, toTime) {
      var self = this;
      common.log('--Clicking Absolute button');
      return self
        .clickAbsoluteButton()
        .then(function () {
          common.log('--Setting From Time : ' + fromTime);
          return self
            .setFromTime(fromTime);
        })
        .then(function () {
          common.log('--Setting To Time : ' + toTime);
          return self
            .setToTime(toTime);
        })
        .then(function () {
          return self
            .clickGoButton();
        });
    },

    collapseTimepicker: function collapseTimepicker() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.fa.fa-chevron-up')
        .click();
    },

    getQueryField: function getQueryField() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('input[ng-model=\'state.query\']');
    },

    getQuerySearchButton: function getQuerySearchButton() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[aria-label=\'Search\']');
    },

    getTimespanText: function getTimespanText() {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('a.navbar-timepicker-time-desc pretty-duration.ng-isolate-scope')
        .then(function (textObj) {
          return textObj
            .getVisibleText();
        });
    },

    saveSearch: function saveSearch(searchName) {
      var self = this;
      return self
        .clickSaveSearchButton()
        .then(function () {
          common.log('--saveSearch button clicked');
          return self.remote
            .setFindTimeout(defaultTimeout)
            .findById('SaveSearch')
            .then(function (searchField) {
              return searchField
                .type(searchName);
            });
        })
        //   // click save button
        .then(function clickSave() {
          common.log('--find save button');
          return self.remote
            .setFindTimeout(defaultTimeout)
            .findByCssSelector('button[ng-disabled="!opts.savedSearch.title"]')
            .then(function (saveButton) {
              common.log('--click save button');
              return saveButton
                .click();
            });
        });
    },

    clickNewSearchButton: function clickNewSearchButton() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[aria-label="New Search"]')
        .then(function (button) {
          return button
            .click();
        });
    },
    clickSaveSearchButton: function clickSaveSearchButton() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[aria-label="Save Search"]')
        .then(function (button) {
          return button
            .click();
        });
    },

    getCurrentQueryName: function getCurrentQueryName() {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('span[bo-bind="opts.savedSearch.title"]')
        .then(function (queryNameField) {
          return queryNameField
            .getVisibleText();
          // .then(function (theString) {
          //   common.log('--found current query name element ' + theString);
          // });

        });
    },

    getBarChartData: function getBarChartData() {
      var barMap = {};
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findAllByCssSelector('rect')
        .then(function (chartTypes) {
          function getChartType(chart) {
            return chart
              .getAttribute('fill')
              .then(function (fillColor) {
                // we're only getting the Green Bars
                if (fillColor === '#57c17b') {
                  return chart
                    .getAttribute('height')
                    .then(function (height) {
                      return chart
                        .getAttribute('x')
                        .then(function (x) {
                          // Add each "x-position : height" pair to the map/object this eliminates problems
                          // with plain hight elements being out of order.
                          // Chrome reads a smaller height than Firefox
                          common.log(Math.round(x) + ': ' + height + ', ');
                          barMap[Math.round(x / 10) * 10] = height;
                        });
                    });
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function () {
          return barMap;
        });
    },

    getSpinnerDone: function getSpinnerDone() {
      common.log('--getSpinner done method');
      return this.remote
        .setFindTimeout(defaultTimeout * 3)
        .findByCssSelector('span.spinner.ng-hide');
    }




  };

  return DiscoverPage;
});
