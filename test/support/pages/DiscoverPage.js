// in test/support/pages/DiscoverPage.js
define(function (require) {
  var config = require('intern').config;
  var Common = require('./Common');

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
      // var barMap = {};
      var barArray = [];
      common.debug('in getBarChartData');
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
    },

    getHitCount: function getHitCount() {
      return thisTime.findByCssSelector('strong.discover-info-hits.ng-binding')
      .getVisibleText();
    },

    selectField: function selectField(fieldName) {
      return thisTime
      .findByCssSelector('field-name[title="' + fieldName + '"]')
      .click();
    },

    getFieldData: function getFieldData() {
      // html body#kibana-body div.content div.application.ng-scope.tab-discover div.app-container.ng-scope div.container-fluid div.row div.col-md-2.sidebar-container.collapsible-sidebar disc-field-chooser.ng-isolate-scope div.sidebar-list ul.list-unstyled.discover-unpopular-fields.hidden-sm.hidden-xs li.sidebar-item.ng-scope div.ng-scope div.discover-field-details div.ng-scope div.discover-field-details-item.ng-scope div div.discover-field-details-value.ng-binding.ng-isolate-scope
      //html body#kibana-body div.content div.application.ng-scope.tab-discover div.app-container.ng-scope div.container-fluid div.row div.col-md-2.sidebar-container.collapsible-sidebar disc-field-chooser.ng-isolate-scope div.sidebar-list ul.list-unstyled.discover-unpopular-fields.hidden-sm.hidden-xs li.sidebar-item.ng-scope div.ng-scope div.discover-field-details
      return thisTime
      .findByCssSelector('div.discover-field-details')
      .getVisibleText();
    }
    // clickAddField: function clickAddField() {
    //   return thisTime
    //   .findByCssSelector('button[ng-bind*="add"]')
    //   .click();
    // }

  };

  return DiscoverPage;
});
