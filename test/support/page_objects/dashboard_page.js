import _ from 'lodash';
import { defaultFindTimeout } from '../';

import {
  scenarioManager,
  esClient,
  elasticDump
} from '../';
import PageObjects from './';

export default class DashboardPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  async initTests() {
    const logstash = scenarioManager.loadIfEmpty('logstashFunctional');
    await esClient.deleteAndUpdateConfigDoc({ 'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*' });

    PageObjects.common.debug('load kibana index with visualizations');
    await elasticDump.elasticLoad('dashboard','.kibana');

    await PageObjects.common.navigateToApp('dashboard');

    return logstash;
  }

  /**
   * Returns true if already on the dashboard landing page (that page doesn't have a link to itself).
   * @returns {Promise<boolean>}
   */
  async onDashboardLandingPage() {
    PageObjects.common.debug(`onDashboardLandingPage`);
    const exists = await PageObjects.common.doesCssSelectorExist('a[href="#/dashboard"]');
    return !exists;
  }

  async gotoDashboardLandingPage() {
    PageObjects.common.debug('Go to dashboard landing page');
    const onPage = await this.onDashboardLandingPage();
    if (!onPage) {
      return PageObjects.common.findByCssSelector('a[href="#/dashboard"]').click();
    }
  }

  clickNewDashboard() {
    return PageObjects.common.findTestSubject('newDashboardLink').click();
  }

  clickAddVisualization() {
    return PageObjects.common.findTestSubject('dashboardAddPanelButton').click();
  }

  clickOptions() {
    return PageObjects.common.findTestSubject('dashboardOptionsButton').click();
  }

  isOptionsOpen() {
    PageObjects.common.debug('isOptionsOpen');
    return PageObjects.common.doesTestSubjectExist('dashboardDarkThemeCheckbox');
  }

  async openOptions() {
    PageObjects.common.debug('openOptions');
    const isOpen = await this.isOptionsOpen();
    if (!isOpen) {
      return PageObjects.common.findTestSubject('dashboardOptionsButton').click();
    }
  }

  async isDarkThemeOn() {
    PageObjects.common.debug('isDarkThemeOn');
    await this.openOptions();
    const darkThemeCheckbox = await PageObjects.common.findTestSubject('dashboardDarkThemeCheckbox');
    return await darkThemeCheckbox.getProperty('checked');
  }

  async useDarkTheme(on) {
    await this.openOptions();
    const isDarkThemeOn = await this.isDarkThemeOn();
    if (isDarkThemeOn !== on) {
      return PageObjects.common.findTestSubject('dashboardDarkThemeCheckbox').click();
    }
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
    PageObjects.common.debug('closeAddVizualizationPanel');
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

  async saveDashboard(dashName, storeTimeWithDash) {
    await PageObjects.common.findTestSubject('dashboardSaveButton').click();

    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.common.sleep(1000);

    PageObjects.common.debug('entering new title');
    await this.findTimeout.findById('dashboardTitle').type(dashName);

    if (storeTimeWithDash !== undefined) {
      await this.storeTimeWithDashboard(storeTimeWithDash);
    }

    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.common.sleep(1000);

    await PageObjects.common.try(() => {
      PageObjects.common.debug('clicking final Save button for named dashboard');
      return this.findTimeout.findByCssSelector('.btn-primary').click();
    });

    await PageObjects.header.waitUntilLoadingHasFinished();

    // verify that green message at the top of the page.
    // it's only there for about 5 seconds
    await PageObjects.common.try(() => {
      PageObjects.common.debug('verify toast-message for saved dashboard');
      return this.findTimeout
        .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
        .getVisibleText();
    });
  }

  clickDashboardByLinkText(dashName) {
    return this.findTimeout
    .findByLinkText(dashName)
    .click();
  }

  // use the search filter box to narrow the results down to a single
  // entry, or at least to a single page of results
  async loadSavedDashboard(dashName) {
    PageObjects.common.debug(`Load Saved Dashboard ${dashName}`);
    const self = this;
    await this.gotoDashboardLandingPage();
    const searchBox = await PageObjects.common.findTestSubject('searchFilter');
    await searchBox.click();
    await searchBox.type(dashName.replace('-',' '));

    await PageObjects.header.waitUntilLoadingHasFinished();
    await PageObjects.common.sleep(1000);
    await this.clickDashboardByLinkText(dashName);
    return PageObjects.header.waitUntilLoadingHasFinished();
  }

  getPanelTitles() {
    PageObjects.common.debug('in getPanelTitles');
    return this.findTimeout
    .findAllByCssSelector('span.panel-title')
    .then(function (titleObjects) {

      function getTitles(chart) {
        return chart.getAttribute('title');
      }

      const getTitlePromises = titleObjects.map(getTitles);
      return Promise.all(getTitlePromises);
    });
  }

  getPanelData() {
    PageObjects.common.debug('in getPanelData');
    return this.findTimeout
    .findAllByCssSelector('li.gs-w')
    .then(function (titleObjects) {

      function getTitles(chart) {
        let obj = {};
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

      const getTitlePromises = titleObjects.map(getTitles);
      return Promise.all(getTitlePromises);
    });
  }

  getTestVisualizationNames() {
    return [
      'Visualization PieChart',
      'Visualization☺ VerticalBarChart',
      'Visualization漢字 AreaChart',
      'Visualization☺漢字 DataTable',
      'Visualization漢字 LineChart',
      'Visualization TileMap',
      'Visualization MetricChart'
    ];
  }

  addVisualizations(visualizations) {
    return visualizations.reduce(function (promise, vizName) {
      return promise
        .then(() => PageObjects.dashboard.addVisualization(vizName));
    }, Promise.resolve());
  }

  async setTimepickerInDataRange() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    await PageObjects.header.setAbsoluteRange(fromTime, toTime);
  }

  async storeTimeWithDashboard(on) {
    PageObjects.common.debug('Storing time with dashboard: ' + on);
    const storeTimeCheckbox = await PageObjects.common.findTestSubject('storeTimeWithDashboard');
    const checked = await storeTimeCheckbox.getProperty('checked');
    if (checked === true && on === false ||
      checked === false && on === true) {
      PageObjects.common.debug('Flipping store time checkbox');
      await storeTimeCheckbox.click();
    }
  }

  async getFilterDescriptions(timeout = defaultFindTimeout) {
    const filters = await PageObjects.common.findAllByCssSelector(
      '.filter-bar > .filter > .filter-description',
      timeout);
    return _.map(filters, async (filter) => await filter.getVisibleText());
  }

  async filterOnPieSlice() {
    PageObjects.common.debug('Filtering on a pie slice');
    const slices = await PageObjects.common.findAllByCssSelector('svg > g > path.slice');
    PageObjects.common.debug('Slices found:' + slices.length);
    return slices[0].click();
  }

}
