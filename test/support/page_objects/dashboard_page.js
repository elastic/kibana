
import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class DashboardPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  gotoDashboardLandingPage() {
    return this.findTimeout
      .findByCssSelector('a[href="#/dashboard"]')
      .click();
  }

  clickNewDashboard() {
    return PageObjects.common.findTestSubject('newDashboardLink')
      .click();
  }

  clickAddVisualization() {
    return PageObjects.common.findTestSubject('dashboardAddPanelButton')
    .click();
  }

  filterVizNames(vizName) {
    return this.findTimeout
    .findByCssSelector('input[placeholder="Visualizations Filter..."]')
    .click()
    .pressKeys(vizName);
  }

  clickVizNameLink(vizName) {
    return this.findTimeout
    .findByLinkText(vizName)
    .click();
  }

  closeAddVizualizationPanel() {
    PageObjects.common.debug('-------------close panel');
    return this.findTimeout
    .findByCssSelector('i.fa fa-chevron-up')
    .click();
  }

  addVisualization(vizName) {
    return this.clickAddVisualization()
    .then(() => {
      PageObjects.common.debug('filter visualization (' + vizName + ')');
      return this.filterVizNames(vizName);
    })
    // this second wait is usually enough to avoid the
    // 'stale element reference: element is not attached to the page document'
    // on the next step
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      // but wrap in a try loop since it can still happen
      return PageObjects.common.try(() => {
        PageObjects.common.debug('click visualization (' + vizName + ')');
        return this.clickVizNameLink(vizName);
      });
    })
    // this second click of 'Add' collapses the Add Visualization pane
    .then(() => {
      return this.clickAddVisualization();
    });
  }

  saveDashboard(dashName) {
    return PageObjects.common.findTestSubject('dashboardSaveButton')
    .click()
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      PageObjects.common.debug('saveButton button clicked');
      return this.findTimeout
      .findById('dashboardTitle')
      .type(dashName);
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    // click save button
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('clicking final Save button for named dashboard');
        return this.findTimeout
        .findByCssSelector('.btn-primary')
        .click();
      });
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    })
    // verify that green message at the top of the page.
    // it's only there for about 5 seconds
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('verify toast-message for saved dashboard');
        return this.findTimeout
        .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .getVisibleText();
      });
    });
  }

  clickDashboardByLinkText(dashName) {
    return this.findTimeout
    .findByLinkText(dashName)
    .click();
  }

  // use the search filter box to narrow the results down to a single
  // entry, or at least to a single page of results
  loadSavedDashboard(dashName) {
    const self = this;
    return this.gotoDashboardLandingPage()
    .then(function filterDashboard() {
      PageObjects.common.debug('Load Saved Dashboard button clicked');
      return PageObjects.common.findTestSubject('searchFilter')
        .click()
        .type(dashName.replace('-',' '));
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(function clickDashboardByLinkedText() {
      return self
      .clickDashboardByLinkText(dashName);
    })
    .then(() => {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  }

  getPanelTitles() {
    PageObjects.common.debug('in getPanelTitles');
    return this.findTimeout
    .findAllByCssSelector('span.panel-title')
    .then(function (titleObjects) {

      function getTitles(chart) {
        return chart.getAttribute('title');
      }

      var getTitlePromises = titleObjects.map(getTitles);
      return Promise.all(getTitlePromises);
    });
  }

  getPanelData() {
    PageObjects.common.debug('in getPanelData');
    return this.findTimeout
    .findAllByCssSelector('li.gs-w')
    .then(function (titleObjects) {

      function getTitles(chart) {
        var obj = {};
        return chart.getAttribute('data-col')
        .then(theData => {
          obj = { dataCol:theData };
          return chart;
        })
        .then(chart => {
          return chart.getAttribute('data-row')
          .then(theData => {
            obj.dataRow = theData;
            return chart;
          });
        })
        .then(chart => {
          return chart.getAttribute('data-sizex')
          .then(theData => {
            obj.dataSizeX = theData;
            return chart;
          });
        })
        .then(chart => {
          return chart.getAttribute('data-sizey')
          .then(theData => {
            obj.dataSizeY = theData;
            return chart;
          });
        })
        .then(chart => {
          return chart.findByCssSelector('span.panel-title')
          .then(function (titleElement) {
            return titleElement.getAttribute('title');
          })
          .then(theData => {
            obj.title = theData;
            return obj;
          });
        });
      }

      var getTitlePromises = titleObjects.map(getTitles);
      return Promise.all(getTitlePromises);
    });
  }

}
