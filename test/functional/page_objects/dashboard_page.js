import _ from 'lodash';
import { DashboardConstants } from '../../../src/core_plugins/kibana/public/dashboard/dashboard_constants';

export function DashboardPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const config = getService('config');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  const defaultFindTimeout = config.get('timeouts.find');

  const getRemote = () => (
    getService('remote')
      .setFindTimeout(config.get('timeouts.find'))
  );

  class DashboardPage {
    async initTests() {
      const logstash = esArchiver.loadIfNeeded('logstash_functional');

      log.debug('load kibana index with visualizations');
      await esArchiver.load('dashboard');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz':'UTC',
        'defaultIndex':'logstash-*'
      });

      await PageObjects.common.navigateToApp('dashboard');
      return logstash;
    }

    /**
     * Returns true if already on the dashboard landing page (that page doesn't have a link to itself).
     * @returns {Promise<boolean>}
     */
    async onDashboardLandingPage() {
      log.debug(`onDashboardLandingPage`);
      const exists = await testSubjects.exists('dashboardLandingPage');
      return exists;
    }

    async clickDashboardBreadcrumbLink() {
      log.debug('clickDashboardBreadcrumbLink');
      await retry.try(() => getRemote().findByCssSelector(`a[href="#${DashboardConstants.LANDING_PAGE_PATH}"]`).click());
    }

    async gotoDashboardLandingPage() {
      log.debug('gotoDashboardLandingPage');
      const onPage = await this.onDashboardLandingPage();
      if (!onPage) {
        await retry.try(async () => {
          await this.clickDashboardBreadcrumbLink();
          await testSubjects.find('searchFilter');
        });
      }
    }

    async getQuery() {
      const queryObject = await testSubjects.find('dashboardQuery');
      return await queryObject.getProperty('value');
    }

    appendQuery(query) {
      log.debug('Appending query');
      return retry.try(() => testSubjects.find('dashboardQuery').type(query));
    }

    clickFilterButton() {
      log.debug('Clicking filter button');
      return testSubjects.click('dashboardQueryFilterButton');
    }

    async clickClone() {
      log.debug('Clicking clone');
      await testSubjects.click('dashboardClone');
    }

    async confirmClone() {
      log.debug('Confirming clone');
      await testSubjects.click('cloneConfirmButton');
    }

    async cancelClone() {
      log.debug('Canceling clone');
      await testSubjects.click('cloneCancelButton');
    }

    async setClonedDashboardTitle(title) {
      await testSubjects.setValue('clonedDashboardTitle', title);
    }

    clickEdit() {
      log.debug('Clicking edit');
      return testSubjects.click('dashboardEditMode');
    }

    getIsInViewMode() {
      log.debug('getIsInViewMode');
      return testSubjects.exists('dashboardEditMode');
    }

    clickCancelOutOfEditMode() {
      log.debug('Clicking cancel');
      return testSubjects.click('dashboardViewOnlyMode');
    }

    clickNewDashboard() {
      return testSubjects.click('newDashboardLink');
    }

    async clickCreateDashboardPrompt() {
      await retry.try(() => testSubjects.click('createDashboardPromptButton'));
    }

    async getCreateDashboardPromptExists() {
      return await testSubjects.exists('createDashboardPromptButton');
    }

    async clickListItemCheckbox() {
      await testSubjects.click('dashboardListItemCheckbox');
    }

    async clickDeleteSelectedDashboards() {
      await testSubjects.click('deleteSelectedDashboards');
    }

    clickAddVisualization() {
      return testSubjects.click('dashboardAddPanelButton');
    }

    clickAddNewVisualizationLink() {
      return testSubjects.click('addNewSavedObjectLink');
    }

    clickOptions() {
      return testSubjects.click('dashboardOptionsButton');
    }

    isOptionsOpen() {
      log.debug('isOptionsOpen');
      return testSubjects.exists('dashboardDarkThemeCheckbox');
    }

    async openOptions() {
      log.debug('openOptions');
      const isOpen = await this.isOptionsOpen();
      if (!isOpen) {
        return testSubjects.click('dashboardOptionsButton');
      }
    }

    async isDarkThemeOn() {
      log.debug('isDarkThemeOn');
      await this.openOptions();
      const darkThemeCheckbox = await testSubjects.find('dashboardDarkThemeCheckbox');
      return await darkThemeCheckbox.getProperty('checked');
    }

    async useDarkTheme(on) {
      await this.openOptions();
      const isDarkThemeOn = await this.isDarkThemeOn();
      if (isDarkThemeOn !== on) {
        return testSubjects.click('dashboardDarkThemeCheckbox');
      }
    }

    filterVizNames(vizName) {
      return retry.try(() => getRemote()
        .findByCssSelector('input[placeholder="Visualizations Filter..."]')
        .click()
        .pressKeys(vizName));
    }

    clickVizNameLink(vizName) {
      return retry.try(() => getRemote()
      .findByPartialLinkText(vizName)
      .click());
    }

    closeAddVizualizationPanel() {
      log.debug('closeAddVizualizationPanel');
      return retry.try(() => getRemote()
      .findByCssSelector('i.fa fa-chevron-up')
      .click());
    }

    async gotoDashboardEditMode(dashboardName) {
      await this.loadSavedDashboard(dashboardName);
      await this.clickEdit();
    }

    async addVisualization(vizName) {
      await this.clickAddVisualization();
      log.debug('filter visualization (' + vizName + ')');
      await this.filterVizNames(vizName);
      // this second wait is usually enough to avoid the
      // 'stale element reference: element is not attached to the page document'
      // on the next step
      await PageObjects.common.sleep(1000);
        // but wrap in a try loop since it can still happen
      await retry.try(() => {
        log.debug('click visualization (' + vizName + ')');
        return this.clickVizNameLink(vizName);
      });
      await PageObjects.header.clickToastOK();
      // this second click of 'Add' collapses the Add Visualization pane
      await this.clickAddVisualization();
    }

    async renameDashboard(dashName) {
      log.debug(`Naming dashboard ` + dashName);
      await testSubjects.click('dashboardRenameButton');
      await getRemote().findById('dashboardTitle').type(dashName);
    }

    /**
     *
     * @param dashName {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean}}
     */
    async saveDashboard(dashName, saveOptions = {}) {
      await this.enterDashboardTitleAndClickSave(dashName, saveOptions);

      await PageObjects.header.waitUntilLoadingHasFinished();

      // verify that green message at the top of the page.
      // it's only there for about 5 seconds
      await retry.try(() => {
        log.debug('verify toast-message for saved dashboard');
        return getRemote()
          .findByCssSelector('kbn-truncated.toast-message.ng-isolate-scope')
          .getVisibleText();
      });
    }

    /**
     *
     * @param dashboardTitle {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean}}
     */
    async enterDashboardTitleAndClickSave(dashboardTitle, saveOptions = {}) {
      await testSubjects.click('dashboardSaveMenuItem');

      await PageObjects.header.waitUntilLoadingHasFinished();

      log.debug('entering new title');
      await getRemote().findById('dashboardTitle').type(dashboardTitle);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      if (saveOptions.saveAsNew !== undefined) {
        await this.setSaveAsNewCheckBox(saveOptions.saveAsNew);
      }

      await retry.try(() => {
        log.debug('clicking final Save button for named dashboard');
        return testSubjects.click('confirmSaveDashboardButton');
      });
    }

    clickDashboardByLinkText(dashName) {
      return getRemote()
      .findByLinkText(dashName)
      .click();
    }

    async searchForDashboardWithName(dashName) {
      log.debug(`searchForDashboardWithName: ${dashName}`);

      await this.gotoDashboardLandingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
        await searchFilter.click();
        // Note: this replacement of - to space is to preserve original logic but I'm not sure why or if it's needed.
        await searchFilter.type(dashName.replace('-',' '));
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getDashboardCountWithName(dashName) {
      log.debug(`getDashboardCountWithName: ${dashName}`);

      await this.searchForDashboardWithName(dashName);
      const links = await getRemote().findAllByLinkText(dashName);
      return links.length;
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    async loadSavedDashboard(dashName) {
      log.debug(`Load Saved Dashboard ${dashName}`);

      await this.searchForDashboardWithName(dashName);
      await this.clickDashboardByLinkText(dashName);
      return PageObjects.header.waitUntilLoadingHasFinished();
    }

    getPanelTitles() {
      log.debug('in getPanelTitles');
      return testSubjects.findAll('dashboardPanelTitle')
      .then(function (titleObjects) {

        function getTitles(chart) {
          return chart.getVisibleText();
        }

        const getTitlePromises = titleObjects.map(getTitles);
        return Promise.all(getTitlePromises);
      });
    }

    getPanelSizeData() {
      log.debug('in getPanelSizeData');
      return getRemote()
      .findAllByCssSelector('li.gs-w') // These are gridster-defined elements and classes
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
            return chart.findByCssSelector('[data-test-subj="dashboardPanelTitle"]')
            .then(function (titleElement) {
              return titleElement.getVisibleText();
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

    getTestVisualizations() {
      return [
        { name: 'Visualization PieChart', description: 'PieChart' },
        { name: 'Visualization☺ VerticalBarChart', description: 'VerticalBarChart' },
        { name: 'Visualization漢字 AreaChart', description: 'AreaChart' },
        { name: 'Visualization☺漢字 DataTable', description: 'DataTable' },
        { name: 'Visualization漢字 LineChart', description: 'LineChart' },
        { name: 'Visualization TileMap', description: 'TileMap' },
        { name: 'Visualization MetricChart', description: 'MetricChart' }
      ];
    }

    getTestVisualizationNames() {
      return this.getTestVisualizations().map(visualization => visualization.name);
    }

    async addVisualizations(visualizations) {
      for (const vizName of visualizations) {
        await this.addVisualization(vizName);
      }
    }

    async setTimepickerInDataRange() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    }

    async setSaveAsNewCheckBox(checked) {
      log.debug('saveAsNewCheckbox: ' + checked);
      const saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
      const isAlreadyChecked = await saveAsNewCheckbox.getProperty('checked');
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping save as new checkbox');
        await retry.try(() => saveAsNewCheckbox.click());
      }
    }

    async setStoreTimeWithDashboard(checked) {
      log.debug('Storing time with dashboard: ' + checked);
      const storeTimeCheckbox = await testSubjects.find('storeTimeWithDashboard');
      const isAlreadyChecked = await storeTimeCheckbox.getProperty('checked');
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping store time checkbox');
        await retry.try(() => storeTimeCheckbox.click());
      }
    }

    async getFilters(timeout = defaultFindTimeout) {
      return await find.allByCssSelector('.filter-bar > .filter', timeout);
    }

    async getFilterDescriptions(timeout = defaultFindTimeout) {
      const filters = await find.allByCssSelector(
        '.filter-bar > .filter > .filter-description',
        timeout);
      return _.map(filters, async (filter) => await filter.getVisibleText());
    }

    async filterOnPieSlice() {
      log.debug('Filtering on a pie slice');
      await retry.try(async () => {
        const slices = await find.allByCssSelector('svg > g > path.slice');
        log.debug('Slices found:' + slices.length);
        return slices[0].click();
      });
    }

    async toggleExpandPanel() {
      log.debug('toggleExpandPanel');
      const expandShown = await testSubjects.exists('dashboardPanelExpandIcon');
      if (!expandShown) {
        const panelElements = await getRemote().findAllByCssSelector('span.panel-title');
        log.debug('click title');
        await retry.try(() => panelElements[0].click()); // Click to simulate hover.
      }
      const expandButton = await testSubjects.find('dashboardPanelExpandIcon');
      log.debug('click expand icon');
      await retry.try(() => expandButton.click());
    }

    getSharedItemsCount() {
      log.debug('in getSharedItemsCount');
      const attributeName = 'data-shared-items-count';
      return getRemote()
      .findByCssSelector(`[${attributeName}]`)
      .then(function (element) {
        if (element) {
          return element.getAttribute(attributeName);
        }

        throw new Error('no element');
      });
    }

    getPanelSharedItemData() {
      log.debug('in getPanelSharedItemData');
      return getRemote()
      .findAllByCssSelector('li.gs-w')
      .then(function (elements) {
        return Promise.all(elements.map(async element => {
          const sharedItem = await element.findByCssSelector('[data-shared-item]');
          return {
            title: await sharedItem.getAttribute('data-title'),
            description: await sharedItem.getAttribute('data-description')
          };
        }));
      });
    }
  }

  return new DashboardPage();
}
