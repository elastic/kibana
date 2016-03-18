// in test/support/pages/dashboard_page.js
define(function (require) {
  var config = require('intern').config;
  var Common = require('./common');

  var defaultTimeout = config.timeouts.default;
  var common;
  var thisTime;

  function DashboardPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
    thisTime = this.remote.setFindTimeout(defaultTimeout);
  }

  DashboardPage.prototype = {
    constructor: DashboardPage,


    clickNewDashboard: function clickNewDashboard() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button.ng-scope[aria-label="New Dashboard"]')
      .click();
    },

    clickAddVisualization: function clickAddVisualization() {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button.ng-scope[aria-label="Add Visualization"]')
      .click();
    },

    filterVizNames: function filterVizNames(vizName) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('input[placeholder="Visualization Filter"]')
      .click()
      .pressKeys(vizName);
    },

    clickVizNameLink: function clickVizNameLink(vizName) {
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByLinkText(vizName)
      .click();
    },

    closeAddVizualizationPanel: function closeAddVizualizationPanel() {
      common.debug('-------------close panel');
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('i.fa fa-chevron-up')
      .click();
    },

    addVisualization: function addVisualization(vizName) {
      var self = this;
      return this.clickAddVisualization()
      .then(function () {
        return self.filterVizNames(vizName);
      })
      .then(function () {
        return common.sleep(1000);
      })
      .then(function () {
        return self.clickVizNameLink(vizName);
      })
      .then(function () {
        return self.clickAddVisualization();
      });
    },

    saveDashboard: function saveDashboard(dashName) {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button.ng-scope[aria-label="Save Dashboard"]')
      .click()
      .then(function () {
        return common.sleep(1000);
      })
      .then(function () {
        common.debug('saveButton button clicked');
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findById('dashboardTitle')
        .type(dashName);
      })
      // click save button
      .then(function () {
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.btn-primary')
        .click();
      })
      // verify that green message at the top of the page.
      // it's only there for about 5 seconds
      .then(function () {
        return self.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .getVisibleText();
      });
    },

    clickDashboardByLinkText: function clickDashboardByLinkText(dashName) {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByLinkText(dashName)
      .click();
    },

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    loadSavedDashboard: function loadSavedDashboard(dashName) {
      var self = this;
      return this.remote
      .setFindTimeout(defaultTimeout)
      .findByCssSelector('button.ng-scope[aria-label="Load Saved Dashboard"]')
      .click()
      .then(function filterDashboard() {
        common.debug('Load Saved Dashboard button clicked');
        return self.remote
        .findByCssSelector('input[name="filter"]')
        .click()
        .type(dashName.replace('-',' '));
      })
      .then(function () {
        return common.sleep(1000);
      })
      .then(function clickDashboardByLinkedText() {
        return self
        .clickDashboardByLinkText(dashName);
      });
    },


    getPanelTitles: function getPanelTitles() {
      common.debug('in getPanelTitles');
      return thisTime
      .findAllByCssSelector('span.panel-title')
      .then(function (titleObjects) {

        function getTitles(chart) {
          return chart.getAttribute('title');
        }

        var getTitlePromises = titleObjects.map(getTitles);
        return Promise.all(getTitlePromises);
      });
    },

    getPanelData: function getPanelData() {
      common.debug('in getPanelData');
      return thisTime
      .findAllByCssSelector('li.gs-w')
      .then(function (titleObjects) {

        function getTitles(chart) {
          var obj = {};
          return chart.getAttribute('data-col')
          .then(function (theData) {
            obj = {dataCol:theData};
            return chart;
          })
          .then(function (chart) {
            return chart.getAttribute('data-row')
            .then(function (theData) {
              obj.dataRow = theData;
              return chart;
            });
          })
          .then(function (chart) {
            return chart.getAttribute('data-sizex')
            .then(function (theData) {
              obj.dataSizeX = theData;
              return chart;
            });
          })
          .then(function (chart) {
            return chart.getAttribute('data-sizey')
            .then(function (theData) {
              obj.dataSizeY = theData;
              return chart;
            });
          })
          .then(function (chart) {
            return chart.findByCssSelector('span.panel-title')
            .then(function (titleElement) {
              return titleElement.getAttribute('title');
            })
            .then(function (theData) {
              obj.title = theData;
              return obj;
            });
          });
        }

        var getTitlePromises = titleObjects.map(getTitles);
        return Promise.all(getTitlePromises);
      });
    }

  };

  return DashboardPage;
});
