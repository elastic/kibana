/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PIE_CHART_VIS_NAME = 'Visualization PieChart';
export const AREA_CHART_VIS_NAME = 'Visualization漢字 AreaChart';
export const LINE_CHART_VIS_NAME = 'Visualization漢字 LineChart';

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';
import { CommonPageObject } from './common_page';

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

interface AddNewDashboardOptions {
  continueEditing?: boolean;
  expectWarning?: boolean;
}

export class DashboardPageObject extends FtrService {
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly dashboardAddPanel = this.ctx.getService('dashboardAddPanel');
  private readonly renderable = this.ctx.getService('renderable');
  private readonly listingTable = this.ctx.getService('listingTable');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly visualize = this.ctx.getPageObject('visualize');
  private readonly appsMenu = this.ctx.getService('appsMenu');
  private readonly toasts = this.ctx.getService('toasts');

  private readonly logstashIndex = this.config.get('esTestCluster.ccs')
    ? 'ftr-remote:logstash-*'
    : 'logstash-*';
  private readonly kibanaIndex = this.config.get('esTestCluster.ccs')
    ? 'test/functional/fixtures/kbn_archiver/ccs/dashboard/legacy/legacy.json'
    : 'test/functional/fixtures/kbn_archiver/dashboard/legacy/legacy.json';

  public readonly APP_ID = 'dashboards';

  async initTests({ kibanaIndex = this.kibanaIndex, defaultIndex = this.logstashIndex } = {}) {
    this.log.debug('load kibana index with visualizations and log data');
    await this.kibanaServer.savedObjects.cleanStandardList();
    await this.kibanaServer.importExport.load(kibanaIndex);
    await this.kibanaServer.uiSettings.replace({ defaultIndex });
    await this.navigateToApp();
  }

  public async navigateToApp() {
    await this.common.navigateToApp(this.APP_ID);
  }

  public async navigateToAppFromAppsMenu() {
    await this.retry.try(async () => {
      await this.appsMenu.clickLink('Dashboard', { category: 'kibana' });
      await this.header.waitUntilLoadingHasFinished();
      const currentUrl = await this.browser.getCurrentUrl();
      if (!currentUrl.includes('app/dashboard')) {
        throw new Error(`Not in dashboard application after clicking 'Dashboard' in apps menu`);
      }
    });
  }

  public async expectAppStateRemovedFromURL() {
    await this.retry.try(async () => {
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
    await this.testSubjects.exists('exitFullScreenModeButton');
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
    return await this.testSubjects.exists('exitFullScreenModeButton');
  }

  public async getExitFullScreenLogoButton() {
    return await this.testSubjects.find('exitFullScreenModeButton');
  }

  public async clickExitFullScreenLogoButton() {
    await this.testSubjects.click('exitFullScreenModeButton');
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
    const endIndexOfFilters = url.indexOf('?');
    const endIndexOfMax = url.substring(startOfIdIndex).indexOf('/');
    if (endIndexOfMax === -1) {
      return url.substring(startOfIdIndex, endIndexOfFilters);
    }
    const endIndex =
      endIndexOfFilters + startOfIdIndex > endIndexOfMax
        ? endIndexOfFilters + startOfIdIndex
        : endIndexOfMax + startOfIdIndex;
    const id = url.substring(startOfIdIndex, endIndex < 0 ? url.length : endIndex + startOfIdIndex);
    return id;
  }

  public async expectUnsavedChangesListingExists(title: string) {
    this.log.debug(`Expect Unsaved Changes Listing Exists for `, title);
    await this.testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async expectUnsavedChangesListingDoesNotExist(title: string) {
    this.log.debug(`Expect Unsaved Changes Listing Does Not Exist for `, title);
    await this.testSubjects.missingOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async clickUnsavedChangesContinueEditing(title: string) {
    this.log.debug(`Click Unsaved Changes Continue Editing `, title);
    await this.testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
    await this.testSubjects.click(`edit-unsaved-${title.split(' ').join('-')}`);
  }

  public async clickUnsavedChangesDiscard(testSubject: string, confirmDiscard = true) {
    this.log.debug(`Click Unsaved Changes Discard for `, testSubject);
    await this.testSubjects.existOrFail(testSubject);
    await this.testSubjects.click(testSubject);
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

  public async expectOnDashboard(expectedTitle: string) {
    await this.retry.waitFor(
      `last breadcrumb to have dashboard title: ${expectedTitle} OR Editing ${expectedTitle}`,
      async () => {
        const actualTitle = await this.globalNav.getLastBreadcrumb();
        this.log.debug(`Expected dashboard title ${expectedTitle}, actual: ${actualTitle}`);
        return actualTitle === expectedTitle || actualTitle === `Editing ${expectedTitle}`;
      }
    );
  }

  public async gotoDashboardLandingPage(ignorePageLeaveWarning = true) {
    this.log.debug('gotoDashboardLandingPage');
    if (await this.onDashboardLandingPage()) return;

    const breadcrumbLink = this.config.get('serverless')
      ? 'breadcrumb breadcrumb-deepLinkId-dashboards'
      : 'breadcrumb dashboardListingBreadcrumb first';
    await this.testSubjects.click(breadcrumbLink);
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

  public async duplicateDashboard(dashboardNameOverride?: string) {
    this.log.debug('Clicking duplicate');

    await this.testSubjects.click('dashboardInteractiveSaveMenuItem');

    if (dashboardNameOverride) {
      this.log.debug('entering dashboard duplicate override title');
      await this.testSubjects.setValue('savedObjectTitle', dashboardNameOverride);
    }

    await this.clickSave();

    // Confirm that the Dashboard has actually been saved
    await this.testSubjects.existOrFail('saveDashboardSuccess');
  }

  /**
   * Asserts that the duplicate title warning is either displayed or not displayed.
   * @param { displayed: boolean }
   */
  public async expectDuplicateTitleWarningDisplayed({ displayed = true }) {
    if (displayed) {
      await this.testSubjects.existOrFail('titleDuplicateWarnMsg');
    } else {
      await this.testSubjects.missingOrFail('titleDuplicateWarnMsg');
    }
  }

  /**
   * Asserts that the toolbar pagination (count and arrows) is either displayed or not displayed.

   */
  public async expectToolbarPaginationDisplayed() {
    const subjects = ['pagination-button-previous', 'pagination-button-next'];

    await Promise.all(subjects.map(async (subj) => await this.testSubjects.existOrFail(subj)));
    const paginationListExists = await this.find.existsByCssSelector('.euiPagination__list');
    if (!paginationListExists) {
      throw new Error(`expected discover data grid pagination list to exist`);
    }
  }

  public async switchToEditMode() {
    this.log.debug('Switching to edit mode');
    if (await this.testSubjects.exists('dashboardEditMode')) {
      // if the dashboard is not already in edit mode
      await this.testSubjects.click('dashboardEditMode');
    }
    // wait until the count of dashboard panels equals the count of drag handles
    await this.retry.waitFor('in edit mode', async () => {
      const panels = await this.find.allByCssSelector('[data-test-subj="embeddablePanel"]');
      const dragHandles = await this.find.allByCssSelector(
        '[data-test-subj="embeddablePanelDragHandle"]'
      );
      return panels.length === dragHandles.length;
    });
  }

  public async getIsInViewMode() {
    this.log.debug('getIsInViewMode');
    return await this.testSubjects.exists('dashboardEditMode');
  }

  public async ensureDashboardIsInEditMode() {
    if (await this.getIsInViewMode()) {
      await this.switchToEditMode();
    }
    await this.waitForRenderComplete();
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

  public async clickDiscardChanges(accept = true) {
    await this.retry.try(async () => {
      await this.expectDiscardChangesButtonEnabled();
      this.log.debug('clickDiscardChanges');
      await this.testSubjects.click('dashboardDiscardChangesMenuItem');
    });
    await this.common.expectConfirmModalOpenState(true);
    if (accept) {
      await this.common.clickConfirmOnModal();
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
      await this.testSubjects.click('toastCloseButton');
    });
    if (switchMode) {
      await this.clickCancelOutOfEditMode();
    }
  }

  public async expectUnsavedChangesBadge() {
    this.log.debug('Expect unsaved changes badge to be present');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('dashboardUnsavedChangesBadge');
    });
  }

  public async expectMissingUnsavedChangesBadge() {
    this.log.debug('Expect there to be no unsaved changes badge');
    await this.retry.try(async () => {
      await this.testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
    });
  }

  public async clickNewDashboard(
    options: AddNewDashboardOptions = { continueEditing: false, expectWarning: false }
  ) {
    const { continueEditing, expectWarning } = options;
    const discardButtonExists = await this.testSubjects.exists('discardDashboardPromptButton');
    if (!continueEditing && discardButtonExists) {
      this.log.debug('found discard button');
      await this.testSubjects.click('discardDashboardPromptButton');
      const confirmation = await this.testSubjects.exists('confirmModalTitleText');
      if (confirmation) {
        await this.common.clickConfirmOnModal();
      }
    }
    await this.listingTable.clickNewButton();
    if (expectWarning) {
      await this.testSubjects.existOrFail('dashboardCreateConfirm');
    }
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

  public async clickCreateDashboardPrompt() {
    await this.testSubjects.click('newItemButton');
  }

  public async getCreateDashboardPromptExists() {
    return this.testSubjects.exists('emptyListPrompt');
  }

  public async isSettingsOpen() {
    this.log.debug('isSettingsOpen');
    return await this.testSubjects.exists('dashboardSettingsMenu');
  }

  public async openSettingsFlyout() {
    this.log.debug('openSettingsFlyout');
    const isOpen = await this.isSettingsOpen();
    if (!isOpen) {
      return await this.testSubjects.click('dashboardSettingsButton');
    }
  }

  // avoids any 'Object with id x not found' errors when switching tests.
  public async clearSavedObjectsFromAppLinks() {
    await this.header.clickVisualize();
    await this.visualize.gotoLandingPage();
    await this.navigateToAppFromAppsMenu();
    await this.gotoDashboardLandingPage();
  }

  public async gotoDashboardEditMode(dashboardName: string) {
    await this.loadSavedDashboard(dashboardName);
    await this.switchToEditMode();
  }

  public async gotoDashboardURL({
    id,
    args,
    editMode,
  }: {
    id?: string;
    editMode?: boolean;
    args?: Parameters<InstanceType<typeof CommonPageObject>['navigateToActualUrl']>[2];
  } = {}) {
    let dashboardLocation = `/create`;
    if (id) {
      const edit = editMode ? `?_a=(viewMode:edit)` : '';
      dashboardLocation = `/view/${id}${edit}`;
    }
    await this.common.navigateToActualUrl('dashboard', dashboardLocation, args);
  }

  public async gotoDashboardListingURL({
    args,
  }: {
    args?: Parameters<InstanceType<typeof CommonPageObject>['navigateToActualUrl']>[2];
  } = {}) {
    await this.common.navigateToActualUrl('dashboard', '/list', args);
  }

  public async renameDashboard(dashboardName: string) {
    this.log.debug(`Naming dashboard ` + dashboardName);
    await this.testSubjects.click('dashboardRenameButton');
    await this.testSubjects.setValue('savedObjectTitle', dashboardName);
  }

  /**
   * @description opens the dashboard settings flyout to modify an existing dashboard
   */
  public async modifyExistingDashboardDetails(
    dashboard: string,
    saveOptions: Pick<SaveDashboardOptions, 'storeTimeWithDashboard' | 'tags' | 'needsConfirm'> = {}
  ) {
    await this.openSettingsFlyout();

    await this.retry.try(async () => {
      this.log.debug('entering new title');
      await this.testSubjects.setValue('dashboardTitleInput', dashboard);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      if (saveOptions.tags) {
        const tagsComboBox = await this.testSubjects.find('comboBoxInput');
        for (const tagName of saveOptions.tags) {
          await this.comboBox.setElement(tagsComboBox, tagName);
        }
      }

      this.log.debug('DashboardPage.applyCustomization');
      await this.testSubjects.click('applyCustomizeDashboardButton');

      if (saveOptions.needsConfirm) {
        await this.ensureDuplicateTitleCallout();
        await this.testSubjects.click('applyCustomizeDashboardButton');
      }

      this.log.debug('isCustomizeDashboardLoadingIndicatorVisible');
      return await this.testSubjects.exists('dashboardUnsavedChangesBadge', { timeout: 1500 });
    });
  }

  /**
   * @description Save the current dashboard with the specified name and options and
   * verify that the save was successful, close the toast and return the
   * toast message
   */
  public async saveDashboard(
    dashboardName: string,
    saveOptions: SaveDashboardOptions = {
      waitDialogIsClosed: true,
      exitFromEditMode: true,
      saveAsNew: true,
    }
  ) {
    await this.retry.try(async () => {
      if (saveOptions.saveAsNew) {
        await this.enterDashboardSaveModalApplyUpdatesAndClickSave(dashboardName, saveOptions);
      } else {
        await this.modifyExistingDashboardDetails(dashboardName, saveOptions);
        await this.clickQuickSave();
      }

      if (saveOptions.needsConfirm) {
        await this.ensureDuplicateTitleCallout();
        await this.clickSave();
      }

      // Confirm that the Dashboard has actually been saved
      await this.testSubjects.existOrFail('saveDashboardSuccess');
    });

    let message;

    if (saveOptions.saveAsNew) {
      message = await this.toasts.getTitleAndDismiss();
      await this.header.waitUntilLoadingHasFinished();
      await this.common.waitForSaveModalToClose();
    }

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
   * @description populates the duplicate dashboard modal
   */
  public async enterDashboardSaveModalApplyUpdatesAndClickSave(
    dashboardTitle: string,
    saveOptions: Omit<SaveDashboardOptions, 'saveAsNew'> = { waitDialogIsClosed: true }
  ) {
    const isSaveModalOpen = await this.testSubjects.exists('savedObjectSaveModal', {
      timeout: 2000,
    });

    if (!isSaveModalOpen) {
      await this.testSubjects.click('dashboardInteractiveSaveMenuItem');
    }

    const modalDialog = await this.testSubjects.find('savedObjectSaveModal');

    this.log.debug('entering new title');
    await this.testSubjects.setValue('savedObjectTitle', dashboardTitle);

    if (saveOptions.storeTimeWithDashboard !== undefined) {
      await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
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
    await this.testSubjects.existOrFail('titleDuplicateWarnMsg');
  }

  public async selectDashboardTags(tagNames: string[]) {
    const tagsComboBox = await this.testSubjects.find('savedObjectTagSelector');
    for (const tagName of tagNames) {
      await this.comboBox.setElement(tagsComboBox, tagName);
    }
    await this.testSubjects.click('savedObjectTitle');
  }

  /**
   * @param dashboardTitle {String}
   */
  public async enterDashboardTitleAndPressEnter(dashboardTitle: string) {
    await this.testSubjects.click('dashboardInteractiveSaveMenuItem');
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

    await this.listingTable.searchForItemWithName(dashboardName, { escape: false });
    await this.retry.try(async () => {
      await this.listingTable.clickItemLink('dashboard', dashboardName);
      await this.header.waitUntilLoadingHasFinished();
      // check Dashboard landing page is not present
      await this.testSubjects.missingOrFail('dashboardLandingPage', { timeout: 10000 });
    });
  }

  public async getPanelTitles() {
    this.log.debug('in getPanelTitles');
    const titleObjects = await this.find.allByCssSelector(
      '[data-test-subj="embeddablePanelTitle"]'
    );
    return await Promise.all(titleObjects.map(async (title) => await title.getVisibleText()));
  }

  /**
   * @return An array of boolean values - true if the panel title is visible in view mode, false if it is not
   */
  public async getVisibilityOfPanelTitles() {
    this.log.debug('in getVisibilityOfPanels');
    // only works if the dashboard is in view mode
    const inViewMode = await this.getIsInViewMode();
    if (!inViewMode) {
      await this.clickCancelOutOfEditMode();
    }
    const visibilities: boolean[] = [];
    const panels = await this.getDashboardPanels();
    for (const panel of panels) {
      const exists = await this.find.descendantExistsByCssSelector(
        'figcaption.embPanel__header',
        panel
      );
      visibilities.push(exists);
    }
    // return to edit mode if a switch to view mode above was necessary
    if (!inViewMode) {
      await this.switchToEditMode();
    }
    return visibilities;
  }

  public async getPanels() {
    return await this.find.allByCssSelector('.react-grid-item'); // These are gridster-defined elements and classes
  }

  public async getPanelDimensions() {
    const panels = await this.getPanels();
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
    return await this.testSubjects.findAll('dashboardPanel');
  }

  public async addVisualizations(visualizations: string[]) {
    await this.dashboardAddPanel.addVisualizations(visualizations);
    await this.waitForRenderComplete();
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
      const attribute = await element.getAttribute(attributeName);

      if (!attribute) throw new Error(`no attribute found for [${attributeName}]`);

      return attribute;
    }

    throw new Error('no element');
  }

  public async waitForRenderComplete() {
    this.log.debug('waitForRenderComplete');
    const count = await this.getSharedItemsCount();
    // eslint-disable-next-line radix
    await this.renderable.waitForRender(parseInt(count));
  }

  public async verifyNoRenderErrors() {
    const errorEmbeddables = await this.testSubjects.findAll('embeddableStackError');
    expect(errorEmbeddables.length).to.be(0);
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

  public async expectMissingSaveOption() {
    await this.testSubjects.missingOrFail('dashboardInteractiveSaveMenuItem');
  }

  public async expectMissingQuickSaveOption() {
    await this.testSubjects.missingOrFail('dashboardQuickSaveMenuItem');
  }
  public async expectExistsQuickSaveOption() {
    await this.testSubjects.existOrFail('dashboardQuickSaveMenuItem');
  }

  public async expectDiscardChangesButtonEnabled() {
    this.log.debug('expectDiscardChangesButtonEnabled');
    const quickSaveButton = await this.testSubjects.find('dashboardDiscardChangesMenuItem');
    const isDisabled = await quickSaveButton.getAttribute('disabled');
    if (isDisabled) {
      throw new Error('Discard changes button disabled');
    }
  }

  public async expectQuickSaveButtonEnabled() {
    this.log.debug('expectQuickSaveButtonEnabled');
    const quickSaveButton = await this.testSubjects.find('dashboardQuickSaveMenuItem');
    const isDisabled = await quickSaveButton.getAttribute('disabled');
    if (isDisabled) {
      throw new Error('Quick save button disabled');
    }
  }

  public async expectQuickSaveButtonDisabled() {
    this.log.debug('expectQuickSaveButtonDisabled');
    const quickSaveButton = await this.testSubjects.find('dashboardQuickSaveMenuItem');
    const isDisabled = await quickSaveButton.getAttribute('disabled');
    if (!isDisabled) {
      throw new Error('Quick save button not disabled');
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

  public async getPanelChartDebugState(panelIndex: number) {
    return await this.elasticChart.getChartDebugData(undefined, panelIndex);
  }

  public async isNotificationExists(panelIndex = 0) {
    const panel = (await this.getDashboardPanels())[panelIndex];
    try {
      const notification = await panel.findByClassName('embPanel__optionsMenuPopover-notification');
      return Boolean(notification);
    } catch (e) {
      // if not found then this is false
      return false;
    }
  }
}
