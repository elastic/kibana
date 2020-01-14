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

import { DashboardConstants } from '../../../src/legacy/core_plugins/kibana/public/dashboard/np_ready/dashboard_constants';

export const PIE_CHART_VIS_NAME = 'Visualization PieChart';
export const AREA_CHART_VIS_NAME = 'Visualization漢字 AreaChart';
export const LINE_CHART_VIS_NAME = 'Visualization漢字 LineChart';
import { FtrProviderContext } from '../ftr_provider_context';

export function DashboardPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const renderable = getService('renderable');
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);

  interface SaveDashboardOptions {
    waitDialogIsClosed: boolean;
    needsConfirm?: boolean;
    storeTimeWithDashboard?: boolean;
    saveAsNew?: boolean;
  }

  class DashboardPage {
    async initTests({ kibanaIndex = 'dashboard/legacy', defaultIndex = 'logstash-*' } = {}) {
      log.debug('load kibana index with visualizations and log data');
      await esArchiver.load(kibanaIndex);
      await kibanaServer.uiSettings.replace({ defaultIndex });
      await PageObjects.common.navigateToApp('dashboard');
    }

    public async preserveCrossAppState() {
      const url = await browser.getCurrentUrl();
      await browser.get(url, false);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async clickFullScreenMode() {
      log.debug(`clickFullScreenMode`);
      await testSubjects.click('dashboardFullScreenMode');
      await testSubjects.exists('exitFullScreenModeLogo');
      await this.waitForRenderComplete();
    }

    public async fullScreenModeMenuItemExists() {
      return await testSubjects.exists('dashboardFullScreenMode');
    }

    public async exitFullScreenTextButtonExists() {
      return await testSubjects.exists('exitFullScreenModeText');
    }

    public async getExitFullScreenTextButton() {
      return await testSubjects.find('exitFullScreenModeText');
    }

    public async exitFullScreenLogoButtonExists() {
      return await testSubjects.exists('exitFullScreenModeLogo');
    }

    public async getExitFullScreenLogoButton() {
      return await testSubjects.find('exitFullScreenModeLogo');
    }

    public async clickExitFullScreenLogoButton() {
      await testSubjects.click('exitFullScreenModeLogo');
      await this.waitForRenderComplete();
    }

    public async clickExitFullScreenTextButton() {
      await testSubjects.click('exitFullScreenModeText');
      await this.waitForRenderComplete();
    }

    public async getDashboardIdFromCurrentUrl() {
      const currentUrl = await browser.getCurrentUrl();
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
    public async onDashboardLandingPage() {
      log.debug(`onDashboardLandingPage`);
      return await testSubjects.exists('dashboardLandingPage', {
        timeout: 5000,
      });
    }

    public async expectExistsDashboardLandingPage() {
      log.debug(`expectExistsDashboardLandingPage`);
      await testSubjects.existOrFail('dashboardLandingPage');
    }

    public async clickDashboardBreadcrumbLink() {
      log.debug('clickDashboardBreadcrumbLink');
      await find.clickByCssSelector(`a[href="#${DashboardConstants.LANDING_PAGE_PATH}"]`);
      await this.expectExistsDashboardLandingPage();
    }

    public async gotoDashboardLandingPage() {
      log.debug('gotoDashboardLandingPage');
      const onPage = await this.onDashboardLandingPage();
      if (!onPage) {
        await this.clickDashboardBreadcrumbLink();
      }
    }

    public async clickClone() {
      log.debug('Clicking clone');
      await testSubjects.click('dashboardClone');
    }

    public async getCloneTitle() {
      return await testSubjects.getAttribute('clonedDashboardTitle', 'value');
    }

    public async confirmClone() {
      log.debug('Confirming clone');
      await testSubjects.click('cloneConfirmButton');
    }

    public async cancelClone() {
      log.debug('Canceling clone');
      await testSubjects.click('cloneCancelButton');
    }

    public async setClonedDashboardTitle(title: string) {
      await testSubjects.setValue('clonedDashboardTitle', title);
    }

    /**
     * Asserts that the duplicate title warning is either displayed or not displayed.
     * @param { displayed: boolean }
     */
    public async expectDuplicateTitleWarningDisplayed({ displayed = true }) {
      if (displayed) {
        await testSubjects.existOrFail('titleDupicateWarnMsg');
      } else {
        await testSubjects.missingOrFail('titleDupicateWarnMsg');
      }
    }

    /**
     * Asserts that the toolbar pagination (count and arrows) is either displayed or not displayed.
     * @param { displayed: boolean }
     */
    public async expectToolbarPaginationDisplayed({ displayed = true }) {
      const subjects = ['btnPrevPage', 'btnNextPage', 'toolBarPagerText'];
      if (displayed) {
        await Promise.all(subjects.map(async subj => await testSubjects.existOrFail(subj)));
      } else {
        await Promise.all(subjects.map(async subj => await testSubjects.missingOrFail(subj)));
      }
    }

    public async switchToEditMode() {
      log.debug('Switching to edit mode');
      await testSubjects.click('dashboardEditMode');
      // wait until the count of dashboard panels equals the count of toggle menu icons
      await retry.waitFor('in edit mode', async () => {
        const [panels, menuIcons] = await Promise.all([
          testSubjects.findAll('embeddablePanel'),
          testSubjects.findAll('embeddablePanelToggleMenuIcon'),
        ]);
        return panels.length === menuIcons.length;
      });
    }

    public async getIsInViewMode() {
      log.debug('getIsInViewMode');
      return await testSubjects.exists('dashboardEditMode');
    }

    public async clickCancelOutOfEditMode() {
      log.debug('clickCancelOutOfEditMode');
      await testSubjects.click('dashboardViewOnlyMode');
    }

    public async clickNewDashboard() {
      await listingTable.clickNewButton('createDashboardPromptButton');
    }

    public async clickCreateDashboardPrompt() {
      await testSubjects.click('createDashboardPromptButton');
    }

    public async getCreateDashboardPromptExists() {
      return await testSubjects.exists('createDashboardPromptButton');
    }

    public async isOptionsOpen() {
      log.debug('isOptionsOpen');
      return await testSubjects.exists('dashboardOptionsMenu');
    }

    public async openOptions() {
      log.debug('openOptions');
      const isOpen = await this.isOptionsOpen();
      if (!isOpen) {
        return await testSubjects.click('dashboardOptionsButton');
      }
    }

    // avoids any 'Object with id x not found' errors when switching tests.
    public async clearSavedObjectsFromAppLinks() {
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await this.gotoDashboardLandingPage();
    }

    public async isMarginsOn() {
      log.debug('isMarginsOn');
      await this.openOptions();
      return await testSubjects.getAttribute('dashboardMarginsCheckbox', 'checked');
    }

    public async useMargins(on = true) {
      await this.openOptions();
      const isMarginsOn = await this.isMarginsOn();
      if (isMarginsOn !== 'on') {
        return await testSubjects.click('dashboardMarginsCheckbox');
      }
    }

    public async gotoDashboardEditMode(dashboardName: string) {
      await this.loadSavedDashboard(dashboardName);
      await this.switchToEditMode();
    }

    public async renameDashboard(dashboardName: string) {
      log.debug(`Naming dashboard ` + dashboardName);
      await testSubjects.click('dashboardRenameButton');
      await testSubjects.setValue('savedObjectTitle', dashboardName);
    }

    /**
     * Save the current dashboard with the specified name and options and
     * verify that the save was successful, close the toast and return the
     * toast message
     *
     * @param dashboardName {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, needsConfirm: false,  waitDialogIsClosed: boolean }}
     */
    public async saveDashboard(
      dashboardName: string,
      saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true }
    ) {
      await this.enterDashboardTitleAndClickSave(dashboardName, saveOptions);

      if (saveOptions.needsConfirm) {
        await this.clickSave();
      }

      // Confirm that the Dashboard has actually been saved
      await testSubjects.existOrFail('saveDashboardSuccess');
      const message = await PageObjects.common.closeToast();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitForSaveModalToClose();

      return message;
    }

    public async cancelSave() {
      log.debug('Canceling save');
      await testSubjects.click('saveCancelButton');
    }

    public async clickSave() {
      log.debug('DashboardPage.clickSave');
      await testSubjects.click('confirmSaveSavedObjectButton');
    }

    /**
     *
     * @param dashboardTitle {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, waitDialogIsClosed: boolean}}
     */
    public async enterDashboardTitleAndClickSave(
      dashboardTitle: string,
      saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true }
    ) {
      await testSubjects.click('dashboardSaveMenuItem');
      const modalDialog = await testSubjects.find('savedObjectSaveModal');

      log.debug('entering new title');
      await testSubjects.setValue('savedObjectTitle', dashboardTitle);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      if (saveOptions.saveAsNew !== undefined) {
        await this.setSaveAsNewCheckBox(saveOptions.saveAsNew);
      }

      await this.clickSave();
      if (saveOptions.waitDialogIsClosed) {
        await testSubjects.waitForDeleted(modalDialog);
      }
    }

    public async ensureDuplicateTitleCallout() {
      await testSubjects.existOrFail('titleDupicateWarnMsg');
    }

    /**
     * @param dashboardTitle {String}
     */
    public async enterDashboardTitleAndPressEnter(dashboardTitle: string) {
      await testSubjects.click('dashboardSaveMenuItem');
      const modalDialog = await testSubjects.find('savedObjectSaveModal');

      log.debug('entering new title');
      await testSubjects.setValue('savedObjectTitle', dashboardTitle);

      await PageObjects.common.pressEnterKey();
      await testSubjects.waitForDeleted(modalDialog);
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    public async loadSavedDashboard(dashboardName: string) {
      log.debug(`Load Saved Dashboard ${dashboardName}`);

      await this.gotoDashboardLandingPage();

      await listingTable.searchForItemWithName(dashboardName);
      await retry.try(async () => {
        await listingTable.clickItemLink('dashboard', dashboardName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // check Dashboard landing page is not present
        await testSubjects.missingOrFail('dashboardLandingPage', { timeout: 10000 });
      });
    }

    public async getPanelTitles() {
      log.debug('in getPanelTitles');
      const titleObjects = await testSubjects.findAll('dashboardPanelTitle');
      return await Promise.all(titleObjects.map(async title => await title.getVisibleText()));
    }

    public async getPanelDimensions() {
      const panels = await find.allByCssSelector('.react-grid-item'); // These are gridster-defined elements and classes
      return await Promise.all(
        panels.map(async panel => {
          const size = await panel.getSize();
          return {
            width: size.width,
            height: size.height,
          };
        })
      );
    }

    public async getPanelCount() {
      log.debug('getPanelCount');
      const panels = await testSubjects.findAll('embeddablePanel');
      return panels.length;
    }

    public getTestVisualizations() {
      return [
        { name: PIE_CHART_VIS_NAME, description: 'PieChart' },
        { name: 'Visualization☺ VerticalBarChart', description: 'VerticalBarChart' },
        { name: AREA_CHART_VIS_NAME, description: 'AreaChart' },
        { name: 'Visualization☺漢字 DataTable', description: 'DataTable' },
        { name: LINE_CHART_VIS_NAME, description: 'LineChart' },
        { name: 'Visualization TileMap', description: 'TileMap' },
        { name: 'Visualization MetricChart', description: 'MetricChart' },
      ];
    }

    public getTestVisualizationNames() {
      return this.getTestVisualizations().map(visualization => visualization.name);
    }

    public getTestVisualizationDescriptions() {
      return this.getTestVisualizations().map(visualization => visualization.description);
    }

    public async getDashboardPanels() {
      return await testSubjects.findAll('embeddablePanel');
    }

    public async addVisualizations(visualizations: string[]) {
      await dashboardAddPanel.addVisualizations(visualizations);
    }

    public async setSaveAsNewCheckBox(checked: boolean) {
      log.debug('saveAsNewCheckbox: ' + checked);
      let saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
      const isAlreadyChecked = (await saveAsNewCheckbox.getAttribute('aria-checked')) === 'true';
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping save as new checkbox');
        saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
        await retry.try(() => saveAsNewCheckbox.click());
      }
    }

    public async setStoreTimeWithDashboard(checked: boolean) {
      log.debug('Storing time with dashboard: ' + checked);
      let storeTimeCheckbox = await testSubjects.find('storeTimeWithDashboard');
      const isAlreadyChecked = (await storeTimeCheckbox.getAttribute('aria-checked')) === 'true';
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping store time checkbox');
        storeTimeCheckbox = await testSubjects.find('storeTimeWithDashboard');
        await retry.try(() => storeTimeCheckbox.click());
      }
    }

    public async getSharedItemsCount() {
      log.debug('in getSharedItemsCount');
      const attributeName = 'data-shared-items-count';
      const element = await find.byCssSelector(`[${attributeName}]`);
      if (element) {
        return await element.getAttribute(attributeName);
      }

      throw new Error('no element');
    }

    public async waitForRenderComplete() {
      log.debug('waitForRenderComplete');
      const count = await this.getSharedItemsCount();
      // eslint-disable-next-line radix
      await renderable.waitForRender(parseInt(count));
    }

    public async getSharedContainerData() {
      log.debug('getSharedContainerData');
      const sharedContainer = await find.byCssSelector('[data-shared-items-container]');
      return {
        title: await sharedContainer.getAttribute('data-title'),
        description: await sharedContainer.getAttribute('data-description'),
        count: await sharedContainer.getAttribute('data-shared-items-count'),
      };
    }

    public async getPanelSharedItemData() {
      log.debug('in getPanelSharedItemData');
      const sharedItems = await find.allByCssSelector('[data-shared-item]');
      return await Promise.all(
        sharedItems.map(async sharedItem => {
          return {
            title: await sharedItem.getAttribute('data-title'),
            description: await sharedItem.getAttribute('data-description'),
          };
        })
      );
    }

    public async checkHideTitle() {
      log.debug('ensure that you can click on hide title checkbox');
      await this.openOptions();
      return await testSubjects.click('dashboardPanelTitlesCheckbox');
    }

    public async expectMissingSaveOption() {
      await testSubjects.missingOrFail('dashboardSaveMenuItem');
    }

    public async getNotLoadedVisualizations(vizList: string[]) {
      const checkList = [];
      for (const name of vizList) {
        const isPresent = await testSubjects.exists(
          `embeddablePanelHeading-${name.replace(/\s+/g, '')}`,
          { timeout: 10000 }
        );
        checkList.push({ name, isPresent });
      }

      return checkList.filter(viz => viz.isPresent === false).map(viz => viz.name);
    }
  }

  return new DashboardPage();
}
