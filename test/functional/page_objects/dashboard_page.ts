/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PIE_CHART_VIS_NAME = 'Visualization PieChart';
export const AREA_CHART_VIS_NAME = 'Visualization漢字 AreaChart';
export const LINE_CHART_VIS_NAME = 'Visualization漢字 LineChart';

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

interface SaveDashboardOptions {
  /**
   * @default true
   */
  waitDialogIsClosed?: boolean;
  exitFromEditMode?: boolean;
  needsConfirm?: boolean;
  storeTimeWithDashboard?: boolean;
  saveAsNew?: boolean;
  tags?: string[];
}

export class DashboardPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly esArchiver = this.ctx.getService('esArchiver');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly dashboardAddPanel = this.ctx.getService('dashboardAddPanel');
  private readonly renderable = this.ctx.getService('renderable');
  private readonly listingTable = this.ctx.getService('listingTable');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly visualize = this.ctx.getPageObject('visualize');
  private readonly discover = this.ctx.getPageObject('discover');

  async initTests({
    kibanaIndex = 'test/functional/fixtures/es_archiver/dashboard/legacy',
    defaultIndex = 'logstash-*',
  } = {}) {
    this.log.debug('load kibana index with visualizations and log data');
    await this.esArchiver.load(kibanaIndex);
    await this.kibanaServer.uiSettings.replace({ defaultIndex });
    await this.common.navigateToApp('dashboard');
  }

  public async expectAppStateRemovedFromURL() {
    this.retry.try(async () => {
      const url = await this.browser.getCurrentUrl();
      expect(url.indexOf('_a')).to.be(-1);
    });
  }

  public async preserveCrossAppState() {
    const url = await this.browser.getCurrentUrl();
    await this.browser.get(url, false);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickFullScreenMode() {
    this.log.debug(`clickFullScreenMode`);
    await this.testSubjects.click('dashboardFullScreenMode');
    await this.testSubjects.exists('exitFullScreenModeLogo');
    await this.waitForRenderComplete();
  }

  public async exitFullScreenMode() {
    this.log.debug(`exitFullScreenMode`);
    const logoButton = await this.getExitFullScreenLogoButton();
    await logoButton.moveMouseTo();
    await this.clickExitFullScreenTextButton();
  }

  public async fullScreenModeMenuItemExists() {
    return await this.testSubjects.exists('dashboardFullScreenMode');
  }

  public async exitFullScreenTextButtonExists() {
    return await this.testSubjects.exists('exitFullScreenModeText');
  }

  public async getExitFullScreenTextButton() {
    return await this.testSubjects.find('exitFullScreenModeText');
  }

  public async exitFullScreenLogoButtonExists() {
    return await this.testSubjects.exists('exitFullScreenModeLogo');
  }

  public async getExitFullScreenLogoButton() {
    return await this.testSubjects.find('exitFullScreenModeLogo');
  }

  public async clickExitFullScreenLogoButton() {
    await this.testSubjects.click('exitFullScreenModeLogo');
    await this.waitForRenderComplete();
  }

  public async clickExitFullScreenTextButton() {
    await this.testSubjects.click('exitFullScreenModeText');
    await this.waitForRenderComplete();
  }

  public async getDashboardIdFromCurrentUrl() {
    const currentUrl = await this.browser.getCurrentUrl();
    const id = this.getDashboardIdFromUrl(currentUrl);

    this.log.debug(`Dashboard id extracted from ${currentUrl} is ${id}`);

    return id;
  }

  public getDashboardIdFromUrl(url: string) {
    const urlSubstring = '#/view/';
    const startOfIdIndex = url.indexOf(urlSubstring) + urlSubstring.length;
    const endIndex = url.indexOf('?');
    const id = url.substring(startOfIdIndex, endIndex < 0 ? url.length : endIndex);
    return id;
  }

  public async expectUnsavedChangesListingExists(title: string) {
    this.log.debug(`Expect Unsaved Changes Listing Exists for `, title);
    await this.testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async expectUnsavedChangesDoesNotExist(title: string) {
    this.log.debug(`Expect Unsaved Changes Listing Does Not Exist for `, title);
    await this.testSubjects.missingOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async clickUnsavedChangesContinueEditing(title: string) {
    this.log.debug(`Click Unsaved Changes Continue Editing `, title);
    await this.testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
    await this.testSubjects.click(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async clickUnsavedChangesDiscard(title: string, confirmDiscard = true) {
    this.log.debug(`Click Unsaved Changes Discard for `, title);
    await this.testSubjects.existOrFail(`discard-unsaved-${title.split(' ').join('-')}`);
    await this.testSubjects.click(`discard-unsaved-${title.split(' ').join('-')}`);
    if (confirmDiscard) {
      await this.common.clickConfirmOnModal();
    } else {
      await this.common.clickCancelOnModal();
    }
  }

  /**
   * Returns true if already on the dashboard landing page (that page doesn't have a link to itself).
   * @returns {Promise<boolean>}
   */
  public async onDashboardLandingPage() {
    this.log.debug(`onDashboardLandingPage`);
    return await this.listingTable.onListingPage('dashboard');
  }

  public async expectExistsDashboardLandingPage() {
    this.log.debug(`expectExistsDashboardLandingPage`);
    await this.testSubjects.existOrFail('dashboardLandingPage');
  }

  public async clickDashboardBreadcrumbLink() {
    this.log.debug('clickDashboardBreadcrumbLink');
    await this.testSubjects.click('breadcrumb dashboardListingBreadcrumb first');
  }

  public async expectOnDashboard(dashboardTitle: string) {
    await this.retry.waitFor(
      'last breadcrumb to have dashboard title',
      async () => (await this.globalNav.getLastBreadcrumb()) === dashboardTitle
    );
  }

  public async gotoDashboardLandingPage(ignorePageLeaveWarning = true) {
    this.log.debug('gotoDashboardLandingPage');
    const onPage = await this.onDashboardLandingPage();
    if (!onPage) {
      await this.clickDashboardBreadcrumbLink();
      await this.retry.try(async () => {
        const warning = await this.testSubjects.exists('confirmModalTitleText');
        if (warning) {
          await this.testSubjects.click(
            ignorePageLeaveWarning ? 'confirmModalConfirmButton' : 'confirmModalCancelButton'
          );
        }
      });
      await this.expectExistsDashboardLandingPage();
    }
  }

  public async clickClone() {
    this.log.debug('Clicking clone');
    await this.testSubjects.click('dashboardClone');
  }

  public async getCloneTitle() {
    return await this.testSubjects.getAttribute('clonedDashboardTitle', 'value');
  }

  public async confirmClone() {
    this.log.debug('Confirming clone');
    await this.testSubjects.click('cloneConfirmButton');
  }

  public async cancelClone() {
    this.log.debug('Canceling clone');
    await this.testSubjects.click('cloneCancelButton');
  }

  public async setClonedDashboardTitle(title: string) {
    await this.testSubjects.setValue('clonedDashboardTitle', title);
  }

  /**
   * Asserts that the duplicate title warning is either displayed or not displayed.
   * @param { displayed: boolean }
   */
  public async expectDuplicateTitleWarningDisplayed({ displayed = true }) {
    if (displayed) {
      await this.testSubjects.existOrFail('titleDupicateWarnMsg');
    } else {
      await this.testSubjects.missingOrFail('titleDupicateWarnMsg');
    }
  }

  /**
   * Asserts that the toolbar pagination (count and arrows) is either displayed or not displayed.

   */
  public async expectToolbarPaginationDisplayed() {
    const isLegacyDefault = await this.discover.useLegacyTable();
    if (isLegacyDefault) {
      const subjects = [
        'pagination-button-previous',
        'pagination-button-next',
        'toolBarTotalDocsText',
      ];
      await Promise.all(subjects.map(async (subj) => await this.testSubjects.existOrFail(subj)));
    } else {
      const subjects = ['pagination-button-previous', 'pagination-button-next'];

      await Promise.all(subjects.map(async (subj) => await this.testSubjects.existOrFail(subj)));
      const paginationListExists = await this.find.existsByCssSelector('.euiPagination__list');
      if (!paginationListExists) {
        throw new Error(`expected discover data grid pagination list to exist`);
      }
    }
  }

  public async switchToEditMode() {
    this.log.debug('Switching to edit mode');
    if (await this.testSubjects.exists('dashboardEditMode')) {
      // if the dashboard is not already in edit mode
      await this.testSubjects.click('dashboardEditMode');
    }
    // wait until the count of dashboard panels equals the count of toggle menu icons
    await this.retry.waitFor('in edit mode', async () => {
      const panels = await this.testSubjects.findAll('embeddablePanel', 2500);
      const menuIcons = await this.testSubjects.findAll('embeddablePanelToggleMenuIcon', 2500);
      return panels.length === menuIcons.length;
    });
  }

  public async getIsInViewMode() {
    this.log.debug('getIsInViewMode');
    return await this.testSubjects.exists('dashboardEditMode');
  }

  public async clickCancelOutOfEditMode(accept = true) {
    this.log.debug('clickCancelOutOfEditMode');
    if (await this.getIsInViewMode()) return;
    await this.retry.waitFor('leave edit mode button enabled', async () => {
      const leaveEditModeButton = await this.testSubjects.find('dashboardViewOnlyMode');
      const isDisabled = await leaveEditModeButton.getAttribute('disabled');
      return !isDisabled;
    });
    await this.testSubjects.click('dashboardViewOnlyMode');
    if (accept) {
      const confirmation = await this.testSubjects.exists('confirmModalTitleText');
      if (confirmation) {
        await this.common.clickConfirmOnModal();
      }
    }
  }

  public async clickQuickSave() {
    await this.retry.try(async () => {
      await this.expectQuickSaveButtonEnabled();
      this.log.debug('clickQuickSave');
      await this.testSubjects.click('dashboardQuickSaveMenuItem');
    });
  }

  public async clearUnsavedChanges() {
    this.log.debug('clearUnsavedChanges');
    let switchMode = false;
    if (await this.getIsInViewMode()) {
      await this.switchToEditMode();
      switchMode = true;
    }
    await this.retry.try(async () => {
      // avoid flaky test by surrounding in retry
      await this.testSubjects.existOrFail('dashboardUnsavedChangesBadge');
      await this.clickQuickSave();
      await this.testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
    });
    if (switchMode) {
      await this.clickCancelOutOfEditMode();
    }
  }

  public async clickNewDashboard(continueEditing = false) {
    await this.listingTable.clickNewButton('createDashboardPromptButton');
    if (await this.testSubjects.exists('dashboardCreateConfirm')) {
      if (continueEditing) {
        await this.testSubjects.click('dashboardCreateConfirmContinue');
      } else {
        await this.testSubjects.click('dashboardCreateConfirmStartOver');
      }
    }
    // make sure the dashboard page is shown
    await this.waitForRenderComplete();
  }

  public async clickNewDashboardExpectWarning(continueEditing = false) {
    await this.listingTable.clickNewButton('createDashboardPromptButton');
    await this.testSubjects.existOrFail('dashboardCreateConfirm');
    if (continueEditing) {
      await this.testSubjects.click('dashboardCreateConfirmContinue');
    } else {
      await this.testSubjects.click('dashboardCreateConfirmStartOver');
    }
    // make sure the dashboard page is shown
    await this.waitForRenderComplete();
  }

  public async clickCreateDashboardPrompt() {
    await this.testSubjects.click('createDashboardPromptButton');
  }

  public async getCreateDashboardPromptExists() {
    return await this.testSubjects.exists('createDashboardPromptButton');
  }

  public async isOptionsOpen() {
    this.log.debug('isOptionsOpen');
    return await this.testSubjects.exists('dashboardOptionsMenu');
  }

  public async openOptions() {
    this.log.debug('openOptions');
    const isOpen = await this.isOptionsOpen();
    if (!isOpen) {
      return await this.testSubjects.click('dashboardOptionsButton');
    }
  }

  // avoids any 'Object with id x not found' errors when switching tests.
  public async clearSavedObjectsFromAppLinks() {
    await this.header.clickVisualize();
    await this.visualize.gotoLandingPage();
    await this.header.clickDashboard();
    await this.gotoDashboardLandingPage();
  }

  public async isMarginsOn() {
    this.log.debug('isMarginsOn');
    await this.openOptions();
    return await this.testSubjects.getAttribute('dashboardMarginsCheckbox', 'checked');
  }

  public async useMargins(on = true) {
    await this.openOptions();
    const isMarginsOn = await this.isMarginsOn();
    if (isMarginsOn !== 'on') {
      return await this.testSubjects.click('dashboardMarginsCheckbox');
    }
  }

  public async isColorSyncOn() {
    this.log.debug('isColorSyncOn');
    await this.openOptions();
    return await this.testSubjects.getAttribute('dashboardSyncColorsCheckbox', 'checked');
  }

  public async useColorSync(on = true) {
    await this.openOptions();
    const isColorSyncOn = await this.isColorSyncOn();
    if (isColorSyncOn !== 'on') {
      return await this.testSubjects.click('dashboardSyncColorsCheckbox');
    }
  }

  public async gotoDashboardEditMode(dashboardName: string) {
    await this.loadSavedDashboard(dashboardName);
    await this.switchToEditMode();
  }

  public async renameDashboard(dashboardName: string) {
    this.log.debug(`Naming dashboard ` + dashboardName);
    await this.testSubjects.click('dashboardRenameButton');
    await this.testSubjects.setValue('savedObjectTitle', dashboardName);
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
    saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true, exitFromEditMode: true },
    clickMenuItem = true
  ) {
    await this.retry.try(async () => {
      await this.enterDashboardTitleAndClickSave(dashboardName, saveOptions, clickMenuItem);

      if (saveOptions.needsConfirm) {
        await this.ensureDuplicateTitleCallout();
        await this.clickSave();
      }

      // Confirm that the Dashboard has actually been saved
      await this.testSubjects.existOrFail('saveDashboardSuccess');
    });
    const message = await this.common.closeToast();
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForSaveModalToClose();

    const isInViewMode = await this.testSubjects.exists('dashboardEditMode');
    if (saveOptions.exitFromEditMode && !isInViewMode) {
      await this.clickCancelOutOfEditMode();
    }
    await this.header.waitUntilLoadingHasFinished();

    return message;
  }

  public async cancelSave() {
    this.log.debug('Canceling save');
    await this.testSubjects.click('saveCancelButton');
  }

  public async clickSave() {
    this.log.debug('DashboardPage.clickSave');
    await this.testSubjects.click('confirmSaveSavedObjectButton');
  }

  /**
   *
   * @param dashboardTitle {String}
   * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, waitDialogIsClosed: boolean}}
   */
  public async enterDashboardTitleAndClickSave(
    dashboardTitle: string,
    saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true },
    clickMenuItem = true
  ) {
    if (clickMenuItem) {
      await this.testSubjects.click('dashboardSaveMenuItem');
    }
    const modalDialog = await this.testSubjects.find('savedObjectSaveModal');

    this.log.debug('entering new title');
    await this.testSubjects.setValue('savedObjectTitle', dashboardTitle);

    if (saveOptions.storeTimeWithDashboard !== undefined) {
      await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
    }

    const saveAsNewCheckboxExists = await this.testSubjects.exists('saveAsNewCheckbox');
    if (saveAsNewCheckboxExists) {
      await this.setSaveAsNewCheckBox(Boolean(saveOptions.saveAsNew));
    }

    if (saveOptions.tags) {
      await this.selectDashboardTags(saveOptions.tags);
    }

    await this.clickSave();
    if (saveOptions.waitDialogIsClosed) {
      await this.testSubjects.waitForDeleted(modalDialog);
    }
  }

  public async ensureDuplicateTitleCallout() {
    await this.testSubjects.existOrFail('titleDupicateWarnMsg');
  }

  public async selectDashboardTags(tagNames: string[]) {
    await this.testSubjects.click('savedObjectTagSelector');
    for (const tagName of tagNames) {
      await this.testSubjects.click(`tagSelectorOption-${tagName.replace(' ', '_')}`);
    }
    await this.testSubjects.click('savedObjectTitle');
  }

  /**
   * @param dashboardTitle {String}
   */
  public async enterDashboardTitleAndPressEnter(dashboardTitle: string) {
    await this.testSubjects.click('dashboardSaveMenuItem');
    const modalDialog = await this.testSubjects.find('savedObjectSaveModal');

    this.log.debug('entering new title');
    await this.testSubjects.setValue('savedObjectTitle', dashboardTitle);

    await this.common.pressEnterKey();
    await this.testSubjects.waitForDeleted(modalDialog);
  }

  // use the search filter box to narrow the results down to a single
  // entry, or at least to a single page of results
  public async loadSavedDashboard(dashboardName: string) {
    this.log.debug(`Load Saved Dashboard ${dashboardName}`);

    await this.gotoDashboardLandingPage();

    await this.listingTable.searchForItemWithName(dashboardName);
    await this.retry.try(async () => {
      await this.listingTable.clickItemLink('dashboard', dashboardName);
      await this.header.waitUntilLoadingHasFinished();
      // check Dashboard landing page is not present
      await this.testSubjects.missingOrFail('dashboardLandingPage', { timeout: 10000 });
    });
  }

  public async getPanelTitles() {
    this.log.debug('in getPanelTitles');
    const titleObjects = await this.testSubjects.findAll('dashboardPanelTitle');
    return await Promise.all(titleObjects.map(async (title) => await title.getVisibleText()));
  }

  // returns an array of Boolean values - true if the panel title is visible in view mode, false if it is not
  public async getVisibilityOfPanelTitles() {
    this.log.debug('in getVisibilityOfPanels');
    // only works if the dashboard is in view mode
    const inViewMode = await this.getIsInViewMode();
    if (!inViewMode) {
      await this.clickCancelOutOfEditMode();
    }
    const visibilities: boolean[] = [];
    const titleObjects = await this.testSubjects.findAll('dashboardPanelTitle__wrapper');
    for (const titleObject of titleObjects) {
      const exists = !(await titleObject.elementHasClass('embPanel__header--floater'));
      visibilities.push(exists);
    }
    // return to edit mode if a switch to view mode above was necessary
    if (!inViewMode) {
      await this.switchToEditMode();
    }
    return visibilities;
  }

  public async getPanelDimensions() {
    const panels = await this.find.allByCssSelector('.react-grid-item'); // These are gridster-defined elements and classes
    return await Promise.all(
      panels.map(async (panel) => {
        const size = await panel.getSize();
        return {
          width: size.width,
          height: size.height,
        };
      })
    );
  }

  public async getPanelCount() {
    this.log.debug('getPanelCount');
    const panels = await this.testSubjects.findAll('embeddablePanel');
    return panels.length;
  }

  public getTestVisualizations() {
    return [
      { name: PIE_CHART_VIS_NAME, description: 'PieChart' },
      { name: 'Visualization☺ VerticalBarChart', description: 'VerticalBarChart' },
      { name: AREA_CHART_VIS_NAME, description: 'AreaChart' },
      { name: 'Visualization☺漢字 DataTable', description: 'DataTable' },
      { name: LINE_CHART_VIS_NAME, description: 'LineChart' },
      { name: 'Visualization MetricChart', description: 'MetricChart' },
    ];
  }

  public getTestVisualizationNames() {
    return this.getTestVisualizations().map((visualization) => visualization.name);
  }

  public getTestVisualizationDescriptions() {
    return this.getTestVisualizations().map((visualization) => visualization.description);
  }

  public async getDashboardPanels() {
    return await this.testSubjects.findAll('embeddablePanel');
  }

  public async addVisualizations(visualizations: string[]) {
    await this.dashboardAddPanel.addVisualizations(visualizations);
  }

  public async setSaveAsNewCheckBox(checked: boolean) {
    this.log.debug('saveAsNewCheckbox: ' + checked);
    let saveAsNewCheckbox = await this.testSubjects.find('saveAsNewCheckbox');
    const isAlreadyChecked = (await saveAsNewCheckbox.getAttribute('aria-checked')) === 'true';
    if (isAlreadyChecked !== checked) {
      this.log.debug('Flipping save as new checkbox');
      saveAsNewCheckbox = await this.testSubjects.find('saveAsNewCheckbox');
      await this.retry.try(() => saveAsNewCheckbox.click());
    }
  }

  public async setStoreTimeWithDashboard(checked: boolean) {
    this.log.debug('Storing time with dashboard: ' + checked);
    let storeTimeCheckbox = await this.testSubjects.find('storeTimeWithDashboard');
    const isAlreadyChecked = (await storeTimeCheckbox.getAttribute('aria-checked')) === 'true';
    if (isAlreadyChecked !== checked) {
      this.log.debug('Flipping store time checkbox');
      storeTimeCheckbox = await this.testSubjects.find('storeTimeWithDashboard');
      await this.retry.try(() => storeTimeCheckbox.click());
    }
  }

  public async getSharedItemsCount() {
    this.log.debug('in getSharedItemsCount');
    const attributeName = 'data-shared-items-count';
    const element = await this.find.byCssSelector(`[${attributeName}]`);
    if (element) {
      return await element.getAttribute(attributeName);
    }

    throw new Error('no element');
  }

  public async waitForRenderComplete() {
    this.log.debug('waitForRenderComplete');
    const count = await this.getSharedItemsCount();
    // eslint-disable-next-line radix
    await this.renderable.waitForRender(parseInt(count));
  }

  public async getSharedContainerData() {
    this.log.debug('getSharedContainerData');
    const sharedContainer = await this.find.byCssSelector('[data-shared-items-container]');
    return {
      title: await sharedContainer.getAttribute('data-title'),
      description: await sharedContainer.getAttribute('data-description'),
      count: await sharedContainer.getAttribute('data-shared-items-count'),
    };
  }

  public async getPanelSharedItemData() {
    this.log.debug('in getPanelSharedItemData');
    const sharedItemscontainer = await this.find.byCssSelector('[data-shared-items-count]');
    const $ = await sharedItemscontainer.parseDomContent();
    return $('[data-shared-item]')
      .toArray()
      .map((item) => {
        return {
          title: $(item).attr('data-title'),
          description: $(item).attr('data-description'),
        };
      });
  }

  public async checkHideTitle() {
    this.log.debug('ensure that you can click on hide title checkbox');
    await this.openOptions();
    return await this.testSubjects.click('dashboardPanelTitlesCheckbox');
  }

  public async expectMissingSaveOption() {
    await this.testSubjects.missingOrFail('dashboardSaveMenuItem');
  }

  public async expectMissingQuickSaveOption() {
    await this.testSubjects.missingOrFail('dashboardQuickSaveMenuItem');
  }
  public async expectExistsQuickSaveOption() {
    await this.testSubjects.existOrFail('dashboardQuickSaveMenuItem');
  }

  public async expectQuickSaveButtonEnabled() {
    this.log.debug('expectQuickSaveButtonEnabled');
    const quickSaveButton = await this.testSubjects.find('dashboardQuickSaveMenuItem');
    const isDisabled = await quickSaveButton.getAttribute('disabled');
    if (isDisabled) {
      throw new Error('Quick save button disabled');
    }
  }

  public async getNotLoadedVisualizations(vizList: string[]) {
    const checkList = [];
    for (const name of vizList) {
      const isPresent = await this.testSubjects.exists(
        `embeddablePanelHeading-${name.replace(/\s+/g, '')}`,
        { timeout: 10000 }
      );
      checkList.push({ name, isPresent });
    }

    return checkList.filter((viz) => viz.isPresent === false).map((viz) => viz.name);
  }

  public async getPanelDrilldownCount(panelIndex = 0): Promise<number> {
    this.log.debug('getPanelDrilldownCount');
    const panel = (await this.getDashboardPanels())[panelIndex];
    try {
      const count = await panel.findByTestSubject(
        'embeddablePanelNotification-ACTION_PANEL_NOTIFICATIONS'
      );
      return Number.parseInt(await count.getVisibleText(), 10);
    } catch (e) {
      // if not found then this is 0 (we don't show badge with 0)
      return 0;
    }
  }

  public async getPanelChartDebugState(panelIndex: number) {
    return await this.elasticChart.getChartDebugData(undefined, panelIndex);
  }
}
