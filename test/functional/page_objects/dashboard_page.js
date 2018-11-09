/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

import { DashboardConstants } from '../../../src/core_plugins/kibana/public/dashboard/dashboard_constants';

export const PIE_CHART_VIS_NAME = 'Visualization PieChart';
export const AREA_CHART_VIS_NAME = 'Visualization漢字 AreaChart';

export function DashboardPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const config = getService('config');
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const renderable = getService('renderable');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'visualize']);

  const defaultFindTimeout = config.get('timeouts.find');

  class DashboardPage {
    async initTests({
      kibanaIndex = 'dashboard/legacy',
      dataIndex = 'logstash_functional',
      defaultIndex = 'logstash-*',
    } = {}) {
      log.debug('load kibana index with visualizations and log data');
      await Promise.all([
        esArchiver.load(kibanaIndex),
        esArchiver.loadIfNeeded(dataIndex)
      ]);

      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': defaultIndex,
        'telemetry:optIn': false
      });
      await this.selectDefaultIndex(defaultIndex);
      await kibanaServer.uiSettings.disableToastAutohide();
      await PageObjects.common.navigateToApp('dashboard');
    }

    async preserveCrossAppState() {
      const url = await remote.getCurrentUrl();
      await remote.get(url, false);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectDefaultIndex(indexName) {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickLinkText(indexName);
      await PageObjects.settings.clickDefaultIndexButton();
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

    async getDashboardIdFromCurrentUrl() {
      const currentUrl = await remote.getCurrentUrl();
      const urlSubstring = 'kibana#/dashboard/';
      const startOfIdIndex = currentUrl.indexOf(urlSubstring) + urlSubstring.length;
      const endIndex = currentUrl.indexOf('?');
      const id = currentUrl.substring(startOfIdIndex, endIndex < 0 ? currentUrl.length : endIndex);

      log.debug(`Dashboard id extracted from ${currentUrl} is ${id}`);

      return id;
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

    async clickClone() {
      log.debug('Clicking clone');
      await testSubjects.click('dashboardClone');
    }

    async getCloneTitle() {
      return await testSubjects.getProperty('clonedDashboardTitle', 'value');
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

    /**
     * Asserts that the duplicate title warning is either displayed or not displayed.
     * @param { displayed: boolean }
     */
    async expectDuplicateTitleWarningDisplayed({ displayed }) {
      if (displayed) {
        await testSubjects.existOrFail('titleDupicateWarnMsg');
      } else {
        await testSubjects.missingOrFail('titleDupicateWarnMsg');
      }
    }

    async switchToEditMode() {
      log.debug('Switching to edit mode');
      await testSubjects.click('dashboardEditMode');
      // wait until the count of dashboard panels equals the count of toggle menu icons
      await retry.waitFor('in edit mode', async () => {
        const [panels, menuIcons] = await Promise.all([
          testSubjects.findAll('dashboardPanel'),
          testSubjects.findAll('dashboardPanelToggleMenuIcon'),
        ]);
        return panels.length === menuIcons.length;
      });
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
      // newDashboardLink button is only visible when dashboard listing table is displayed (at least one dashboard).
      const exists = await testSubjects.exists('newDashboardLink');
      if (exists) {
        return await testSubjects.click('newDashboardLink');
      }

      // no dashboards exist, click createDashboardPromptButton to create new dashboard
      return await this.clickCreateDashboardPrompt();
    }

    async clickCreateDashboardPrompt() {
      await testSubjects.click('createDashboardPromptButton');
    }

    async getCreateDashboardPromptExists() {
      return await testSubjects.exists('createDashboardPromptButton');
    }

    async checkDashboardListingRow(id) {
      await testSubjects.click(`checkboxSelectRow-${id}`);
    }

    async checkDashboardListingSelectAllCheckbox() {
      const element = await testSubjects.find('checkboxSelectAll');
      const isSelected = await element.isSelected();
      if (!isSelected) {
        log.debug(`checking checkbox "checkboxSelectAll"`);
        await testSubjects.click('checkboxSelectAll');
      }
    }

    async clickDeleteSelectedDashboards() {
      await testSubjects.click('deleteSelectedDashboards');
    }

    async isOptionsOpen() {
      log.debug('isOptionsOpen');
      return await testSubjects.exists('dashboardOptionsMenu');
    }

    async openOptions() {
      log.debug('openOptions');
      const isOpen = await this.isOptionsOpen();
      if (!isOpen) {
        return await testSubjects.click('dashboardOptionsButton');
      }
    }

    // avoids any 'Object with id x not found' errors when switching tests.
    async clearSavedObjectsFromAppLinks() {
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await this.gotoDashboardLandingPage();
    }

    async isDarkThemeOn() {
      log.debug('isDarkThemeOn');
      await this.openOptions();
      const darkThemeCheckbox = await testSubjects.find('dashboardDarkThemeCheckbox');
      return await darkThemeCheckbox.getProperty('checked');
    }

    async useDarkTheme(on) {
      log.debug(`useDarkTheme: on ${on}`);
      await this.openOptions();
      const isDarkThemeOn = await this.isDarkThemeOn();
      if (isDarkThemeOn !== on) {
        return await testSubjects.click('dashboardDarkThemeCheckbox');
      }
    }

    async isMarginsOn() {
      log.debug('isMarginsOn');
      await this.openOptions();
      const marginsCheckbox = await testSubjects.find('dashboardMarginsCheckbox');
      return await marginsCheckbox.getProperty('checked');
    }

    async useMargins(on = true) {
      await this.openOptions();
      const isMarginsOn = await this.isMarginsOn();
      if (isMarginsOn !== on) {
        return await testSubjects.click('dashboardMarginsCheckbox');
      }
    }

    async gotoDashboardEditMode(dashboardName) {
      await this.loadSavedDashboard(dashboardName);
      await this.switchToEditMode();
    }

    async renameDashboard(dashName) {
      log.debug(`Naming dashboard ` + dashName);
      await testSubjects.click('dashboardRenameButton');
      await testSubjects.setValue('savedObjectTitle', dashName);
    }

    /**
     * Save the current dashboard with the specified name and options and
     * verify that the save was successful
     *
     * @param dashName {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, needsConfirm: false}}
     */
    async saveDashboard(dashName, saveOptions = {}) {
      await this.enterDashboardTitleAndClickSave(dashName, saveOptions);

      if (saveOptions.needsConfirm) {
        await this.clickSave();
      }

      // Confirm that the Dashboard has actually been saved
      await testSubjects.existOrFail('saveDashboardSuccess');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await this.waitForSaveModalToClose();
    }

    async waitForSaveModalToClose() {
      log.debug('Waiting for dashboard save modal to close');
      await retry.try(async () => {
        if (await testSubjects.exists('savedObjectSaveModal')) {
          throw new Error('dashboard save still open');
        }
      });
    }

    async deleteDashboard(dashboardName, dashboardId) {
      await this.gotoDashboardLandingPage();
      await this.searchForDashboardWithName(dashboardName);
      await this.checkDashboardListingRow(dashboardId);
      await this.clickDeleteSelectedDashboards();
      await PageObjects.common.clickConfirmOnModal();
    }

    async cancelSave() {
      log.debug('Canceling save');
      await testSubjects.click('saveCancelButton');
    }

    async clickSave() {
      log.debug('DashboardPage.clickSave');
      await testSubjects.clickWhenNotDisabled('confirmSaveSavedObjectButton');
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
      await testSubjects.setValue('savedObjectTitle', dashboardTitle);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      if (saveOptions.saveAsNew !== undefined) {
        await this.setSaveAsNewCheckBox(saveOptions.saveAsNew);
      }

      await this.clickSave();
    }

    async selectDashboard(dashName) {
      await testSubjects.click(`dashboardListingTitleLink-${dashName.split(' ').join('-')}`);
    }

    async clearSearchValue() {
      log.debug(`clearSearchValue`);

      await this.gotoDashboardLandingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
        await PageObjects.common.pressEnterKey();
      });
    }

    async getSearchFilterValue() {
      const searchFilter = await testSubjects.find('searchFilter');
      return await searchFilter.getProperty('value');
    }

    async searchForDashboardWithName(dashName) {
      log.debug(`searchForDashboardWithName: ${dashName}`);

      await this.gotoDashboardLandingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
        await searchFilter.click();
        // Note: this replacement of - to space is to preserve original logic but I'm not sure why or if it's needed.
        await searchFilter.type(dashName.replace('-', ' '));
        await PageObjects.common.pressEnterKey();
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getCountOfDashboardsInListingTable() {
      const dashboardTitles = await find.allByCssSelector('[data-test-subj^="dashboardListingTitleLink"]');
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

      await this.gotoDashboardLandingPage();

      await retry.try(async () => {
        await this.searchForDashboardWithName(dashName);
        await this.selectDashboard(dashName);
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

    async getPanelDimensions() {
      const panels = await find.allByCssSelector('.react-grid-item'); // These are gridster-defined elements and classes
      async function getPanelDimensions(panel) {
        const size = await panel.getSize();
        return {
          width: size.width,
          height: size.height
        };
      }

      const getDimensionsPromises = _.map(panels, getPanelDimensions);
      return await Promise.all(getDimensionsPromises);
    }

    async getPanelCount() {
      log.debug('getPanelCount');
      const panels = await testSubjects.findAll('dashboardPanel');
      return panels.length;
    }

    getTestVisualizations() {
      return [
        { name: PIE_CHART_VIS_NAME, description: 'PieChart' },
        { name: 'Visualization☺ VerticalBarChart', description: 'VerticalBarChart' },
        { name: AREA_CHART_VIS_NAME, description: 'AreaChart' },
        { name: 'Visualization☺漢字 DataTable', description: 'DataTable' },
        { name: 'Visualization漢字 LineChart', description: 'LineChart' },
        { name: 'Visualization TileMap', description: 'TileMap' },
        { name: 'Visualization MetricChart', description: 'MetricChart' }
      ];
    }

    getTestVisualizationNames() {
      return this.getTestVisualizations().map(visualization => visualization.name);
    }

    getTestVisualizationDescriptions() {
      return this.getTestVisualizations().map(visualization => visualization.description);
    }

    async getDashboardPanels() {
      return await testSubjects.findAll('dashboardPanel');
    }

    async addVisualizations(visualizations) {
      await dashboardAddPanel.addVisualizations(visualizations);
    }

    async setTimepickerInHistoricalDataRange() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    }

    async setTimepickerInDataRange() {
      const fromTime = '2018-01-01 00:00:00.000';
      const toTime = '2018-04-13 00:00:00.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    }

    async setTimepickerInLogstashDataRange() {
      const fromTime = '2018-04-09 00:00:00.000';
      const toTime = '2018-04-13 00:00:00.000';
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

    async getPieSliceCount(timeout) {
      log.debug('getPieSliceCount');
      return await retry.try(async () => {
        const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice', timeout);
        return slices.length;
      });
    }

    async filterOnPieSlice(sliceValue) {
      log.debug(`Filtering on a pie slice with optional value ${sliceValue}`);
      if (sliceValue) {
        await testSubjects.click(`pieSlice-${sliceValue}`);
      } else {
        // If no pie slice has been provided, find the first one available.
        await retry.try(async () => {
          const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice');
          log.debug('Slices found:' + slices.length);
          return slices[0].click();
        });
      }
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

    async waitForRenderComplete() {
      log.debug('waitForRenderComplete');
      const count = await this.getSharedItemsCount();
      await renderable.waitForRender(parseInt(count));
    }

    async getSharedContainerData() {
      log.debug('getSharedContainerData');
      const sharedContainer = await find.byCssSelector('[data-shared-items-container]');
      return {
        title: await sharedContainer.getAttribute('data-title'),
        description: await sharedContainer.getAttribute('data-description'),
        count: await sharedContainer.getAttribute('data-shared-items-count'),
      };
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

    async checkHideTitle() {
      log.debug('ensure that you can click on hide title checkbox');
      await this.openOptions();
      return await testSubjects.click('dashboardPanelTitlesCheckbox');
    }

  }

  return new DashboardPage();
}
