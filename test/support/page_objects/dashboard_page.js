import { remote, common, defaultFindTimeout, headerPage } from '../';

export default (function () {
  var thisTime;

  function DashboardPage() {
  }

  DashboardPage.prototype = {
    constructor: DashboardPage,

    init(remote) {
      this.remote = remote;
      thisTime = this.remote.setFindTimeout(defaultFindTimeout);
    },

    clickNewDashboard: function clickNewDashboard() {
      return thisTime
      .findByCssSelector('button.ng-scope[aria-label="New Dashboard"]')
      .click();
    },

    clickAddVisualization: function clickAddVisualization() {
      return thisTime
      .findByCssSelector('button.ng-scope[aria-label="Add a panel to the dashboard"]')
      .click();
    },

    filterVizNames: function filterVizNames(vizName) {
      return thisTime
      .findByCssSelector('input[placeholder="Visualizations Filter..."]')
      .click()
      .pressKeys(vizName);
    },

    clickVizNameLink: function clickVizNameLink(vizName) {
      return thisTime
      .findByLinkText(vizName)
      .click();
    },

    closeAddVizualizationPanel: function closeAddVizualizationPanel() {
      common.debug('-------------close panel');
      return thisTime
      .findByCssSelector('i.fa fa-chevron-up')
      .click();
    },

    addVisualization: function addVisualization(vizName) {
      var self = this;
      return this.clickAddVisualization()
      .then(function () {
        common.debug('filter visualization (' + vizName + ')');
        return self.filterVizNames(vizName);
      })
      // this second wait is usually enough to avoid the
      // 'stale element reference: element is not attached to the page document'
      // on the next step
      .then(function () {
        return common.sleep(1000);
      })
      .then(function () {
        // but wrap in a try loop since it can still happen
        return common.try(function () {
          common.debug('click visualization (' + vizName + ')');
          return self.clickVizNameLink(vizName);
        });
      })
      // this second click of 'Add' collapses the Add Visualization pane
      .then(function () {
        return self.clickAddVisualization();
      });
    },

    saveDashboard: function saveDashboard(dashName) {
      var self = this;
      return thisTime
      .findByCssSelector('button.ng-scope[aria-label="Save Dashboard"]')
      .click()
      .then(function () {
        return headerPage.getSpinnerDone();
      })
      .then(function () {
        return common.sleep(1000);
      })
      .then(function () {
        common.debug('saveButton button clicked');
        return thisTime
        .findById('dashboardTitle')
        .type(dashName);
      })
      .then(function () {
        return headerPage.getSpinnerDone();
      })
      .then(function () {
        return common.sleep(1000);
      })
      // click save button
      .then(function () {
        return common.try(function () {
          common.debug('clicking final Save button for named dashboard');
          return thisTime
          .findByCssSelector('.btn-primary')
          .click();
        });
      })
      .then(function () {
        return headerPage.getSpinnerDone();
      })
      // verify that green message at the top of the page.
      // it's only there for about 5 seconds
      .then(function () {
        return common.try(function () {
          common.debug('verify toast-message for saved dashboard');
          return thisTime
          .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
          .getVisibleText();
        });
      });
    },

    clickDashboardByLinkText: function clickDashboardByLinkText(dashName) {
      return thisTime
      .findByLinkText(dashName)
      .click();
    },

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    loadSavedDashboard: function loadSavedDashboard(dashName) {
      var self = this;
      return thisTime
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
        return headerPage.getSpinnerDone();
      })
      .then(function () {
        return common.sleep(1000);
      })
      .then(function clickDashboardByLinkedText() {
        return self
        .clickDashboardByLinkText(dashName);
      })
      .then(function () {
        return headerPage.getSpinnerDone();
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
}());
