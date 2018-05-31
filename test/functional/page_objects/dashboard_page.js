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
        'defaultIndex': defaultIndex
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

    async isDuplicateTitleWarningDisplayed() {
      return await testSubjects.exists('titleDupicateWarnMsg');
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
      await this.clickEdit();
    }

    async renameDashboard(dashName) {
      log.debug(`Naming dashboard ` + dashName);
      await testSubjects.click('dashboardRenameButton');
      await testSubjects.setValue('dashboardTitle', dashName);
    }

    /**
     *
     * @param dashName {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, needsConfirm: false}}
     */
    async saveDashboard(dashName, saveOptions = {}) {
      await this.enterDashboardTitleAndClickSave(dashName, saveOptions);

      if (saveOptions.needsConfirm) {
        await this.clickSave();
      }

      await PageObjects.header.waitUntilLoadingHasFinished();

      // Confirm that the Dashboard has been saved.
      return await testSubjects.exists('saveDashboardSuccess');
    }

    async cancelSave() {
      log.debug('Canceling save');
      await testSubjects.click('saveCancelButton');
    }

    async clickSave() {
      await retry.try(async () => {
        log.debug('clicking final Save button for named dashboard');
        return await testSubjects.click('confirmSaveDashboardButton');
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
      await testSubjects.setValue('dashboardTitle', dashboardTitle);

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
      const dashboardTitles = await find.allByCssSelector('.dashboardLink');
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
      await retry.try(async () => {
        const sharedItems = await find.allByCssSelector('[data-shared-item]');
        const renderComplete = await Promise.all(sharedItems.map(async sharedItem => {
          return await sharedItem.getAttribute('data-render-complete');
        }));
        if (renderComplete.length !== sharedItems.length) {
          const expecting = `expecting: ${sharedItems.length}, received: ${renderComplete.length}`;
          throw new Error(
            `Some shared items dont have data-render-complete attribute, ${expecting}`);
        }
        const totalCount = renderComplete.filter(value => value === 'true' || value === 'disabled').length;
        if (totalCount < sharedItems.length) {
          const expecting = `${sharedItems.length}, received: ${totalCount}`;
          throw new Error(`Still waiting on more visualizations to finish rendering, expecting: ${expecting}`);
        }
      });
    }

    async getSharedContainerData() {
      log.debug('getSharedContainerData');
      const sharedContainer = await find.byCssSelector('[data-shared-items-container]');
      return {
        title: await sharedContainer.getAttribute('data-title'),
        description: await sharedContainer.getAttribute('data-description')
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
