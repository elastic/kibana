import _ from 'lodash';
import { DashboardConstants } from '../../../src/core_plugins/kibana/public/dashboard/dashboard_constants';

export function DashboardPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const config = getService('config');
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  const defaultFindTimeout = config.get('timeouts.find');

  class DashboardPage {
    async initTests() {
      const logstash = esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz':'UTC',
        'defaultIndex':'logstash-*'
      });

      log.debug('load kibana index with visualizations');
      await esArchiver.load('dashboard');

      await PageObjects.common.navigateToApp('dashboard');
      return logstash;
    }

    async clickEditVisualization() {
      log.debug('clickEditVisualization');
      await testSubjects.click('dashboardPanelEditLink');

      await retry.try(async () => {
        const current = await remote.getCurrentUrl();
        if (current.indexOf('visualize') < 0) {
          throw new Error('not on visualize page');
        }
      });
    }

    async clickFullScreenMode() {
      log.debug(`clickFullScreenMode`);
      await testSubjects.click('dashboardFullScreenMode');
    }

    async fullScreenModeMenuItemExists() {
      return await testSubjects.exists('dashboardFullScreenMode');
    }

    async exitFullScreenTextButtonExists() {
      return await testSubjects.exists('exitFullScreenModeText');
    }

    async getExitFullScreenTextButton() {
      return await testSubjects.find('exitFullScreenModeText');
    }

    async exitFullScreenLogoButtonExists() {
      return await testSubjects.exists('exitFullScreenModeLogo');
    }

    async getExitFullScreenLogoButton() {
      return await testSubjects.find('exitFullScreenModeLogo');
    }

    async clickExitFullScreenLogoButton() {
      await testSubjects.click('exitFullScreenModeLogo');
    }

    async clickExitFullScreenTextButton() {
      await testSubjects.click('exitFullScreenModeText');
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
      await find.clickByCssSelector(`a[href="#${DashboardConstants.LANDING_PAGE_PATH}"]`);
    }

    async gotoDashboardLandingPage() {
      log.debug('gotoDashboardLandingPage');
      const onPage = await this.onDashboardLandingPage();
      if (!onPage) {
        await retry.try(async () => {
          await this.clickDashboardBreadcrumbLink();
          const onDashboardLandingPage = await this.onDashboardLandingPage();
          if (!onDashboardLandingPage) throw new Error('Not on the landing page.');
        });
      }
    }

    async getQueryInputElement() {
      return await testSubjects.find('queryInput');
    }

    async getQuery() {
      log.debug(`getQuery`);
      const queryInputElement = await this.getQueryInputElement();
      return await queryInputElement.getProperty('value');
    }

    async setQuery(query) {
      log.debug(`setQuery(${query})`);
      return await testSubjects.setValue('queryInput', query);
    }

    async clickFilterButton() {
      log.debug('Clicking filter button');
      return await testSubjects.click('querySubmitButton');
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

    async clickEdit() {
      log.debug('Clicking edit');
      return await testSubjects.click('dashboardEditMode');
    }

    async getIsInViewMode() {
      log.debug('getIsInViewMode');
      return await testSubjects.exists('dashboardEditMode');
    }

    async clickCancelOutOfEditMode() {
      log.debug('clickCancelOutOfEditMode');
      return await testSubjects.click('dashboardViewOnlyMode');
    }

    async clickNewDashboard() {
      return await testSubjects.click('newDashboardLink');
    }

    async clickCreateDashboardPrompt() {
      await testSubjects.click('createDashboardPromptButton');
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

    async clickAddVisualization() {
      await testSubjects.click('dashboardAddPanelButton');
    }

    async clickAddNewVisualizationLink() {
      await testSubjects.click('addNewSavedObjectLink');
    }

    async clickOptions() {
      await testSubjects.click('dashboardOptionsButton');
    }

    async isOptionsOpen() {
      log.debug('isOptionsOpen');
      return await testSubjects.exists('dashboardDarkThemeCheckbox');
    }

    async openOptions() {
      log.debug('openOptions');
      const isOpen = await this.isOptionsOpen();
      if (!isOpen) {
        return await testSubjects.click('dashboardOptionsButton');
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
        return await testSubjects.click('dashboardDarkThemeCheckbox');
      }
    }

    async filterVizNames(vizName) {
      const visFilter = await find.byCssSelector('input[placeholder="Visualizations Filter..."]');
      await visFilter.click();
      await remote.pressKeys(vizName);
    }

    async clickVizNameLink(vizName) {
      await find.clickByPartialLinkText(vizName);
    }

    async closeAddVizualizationPanel() {
      log.debug('closeAddVizualizationPanel');
      await find.clickByCssSelector('i.fa fa-chevron-up');
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
      await testSubjects.setValue('dashboardTitle', dashName);
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
      return await PageObjects.header.getToastMessage();
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
      await testSubjects.setValue('dashboardTitle', dashboardTitle);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      if (saveOptions.saveAsNew !== undefined) {
        await this.setSaveAsNewCheckBox(saveOptions.saveAsNew);
      }

      await retry.try(async () => {
        log.debug('clicking final Save button for named dashboard');
        return await testSubjects.click('confirmSaveDashboardButton');
      });
    }

    async clickDashboardByLinkText(dashName) {
      await find.clickByLinkText(dashName);
    }

    async clearSearchValue() {
      log.debug(`clearSearchValue`);

      await this.gotoDashboardLandingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
      });
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

    async getCountOfDashboardsInListingTable() {
      const dashboardTitles = await testSubjects.findAll('dashboardListingTitleLink');
      return dashboardTitles.length;
    }

    async getDashboardCountWithName(dashName) {
      log.debug(`getDashboardCountWithName: ${dashName}`);

      await this.searchForDashboardWithName(dashName);
      const links = await find.allByLinkText(dashName);
      return links.length;
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    async loadSavedDashboard(dashName) {
      log.debug(`Load Saved Dashboard ${dashName}`);

      await retry.try(async () => {
        await this.searchForDashboardWithName(dashName);
        await this.clickDashboardByLinkText(dashName);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const onDashboardLandingPage = await this.onDashboardLandingPage();
        if (onDashboardLandingPage) {
          throw new Error('Failed to open the dashboard up');
        }
      });
    }

    async getPanelTitles() {
      log.debug('in getPanelTitles');
      const titleObjects = await testSubjects.findAll('dashboardPanelTitle');

      function getTitles(chart) {
        return chart.getVisibleText();
      }
      const getTitlePromises = _.map(titleObjects, getTitles);
      return Promise.all(getTitlePromises);
    }

    async getDashboardPanels() {
      return await testSubjects.findAll('dashboardPanel');
    }

    async getPanelSizeData() {
      const titleObjects = await find.allByCssSelector('li.gs-w'); // These are gridster-defined elements and classes
      async function getTitles(chart) {
        const dataCol = await chart.getAttribute('data-col');
        const dataRow = await chart.getAttribute('data-row');
        const dataSizeX = await chart.getAttribute('data-sizex');
        const dataSizeY = await chart.getAttribute('data-sizey');
        const childElement = await testSubjects.findDescendant('dashboardPanelTitle', chart);
        const title = await childElement.getVisibleText();
        return { dataCol, dataRow, dataSizeX, dataSizeY, title };
      }

      const getTitlePromises = _.map(titleObjects, getTitles);
      return await Promise.all(getTitlePromises);
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
      return await find.allByCssSelector('.filter-bar .filter', timeout);
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
        const panelElements = await find.allByCssSelector('span.panel-title');
        log.debug('click title');
        await retry.try(() => panelElements[0].click()); // Click to simulate hover.
      }
      const expandButton = await testSubjects.find('dashboardPanelExpandIcon');
      log.debug('click expand icon');
      await retry.try(() => expandButton.click());
    }

    async getSharedItemsCount() {
      log.debug('in getSharedItemsCount');
      const attributeName = 'data-shared-items-count';
      const element = await find.byCssSelector(`[${attributeName}]`);
      if (element) {
        return await element.getAttribute(attributeName);
      }

      throw new Error('no element');
    }

    async getPanelSharedItemData() {
      log.debug('in getPanelSharedItemData');
      const sharedItems = await find.allByCssSelector('[data-shared-item]');
      return await Promise.all(sharedItems.map(async sharedItem => {
        return {
          title: await sharedItem.getAttribute('data-title'),
          description: await sharedItem.getAttribute('data-description')
        };
      }));
    }
  }

  return new DashboardPage();
}
