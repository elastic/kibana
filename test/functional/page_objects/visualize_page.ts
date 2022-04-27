/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeConstants } from '@kbn/visualizations-plugin/common/constants';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { FtrService } from '../ftr_provider_context';

// TODO: Remove & Refactor to use the TTV page objects
interface VisualizeSaveModalArgs {
  saveAsNew?: boolean;
  redirectToOrigin?: boolean;
  addToDashboard?: boolean;
  dashboardId?: string;
}

type DashboardPickerOption =
  | 'add-to-library-option'
  | 'existing-dashboard-option'
  | 'new-dashboard-option';

/**
 * This page object contains the visualization type selection, the landing page,
 * and the open/save dialog functions
 */
export class VisualizePageObject extends FtrService {
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly listingTable = this.ctx.getService('listingTable');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly visEditor = this.ctx.getPageObject('visEditor');
  private readonly visChart = this.ctx.getPageObject('visChart');

  index = {
    LOGSTASH_TIME_BASED: 'logstash-*',
    LOGSTASH_NON_TIME_BASED: 'logstash*',
  };

  remoteEsPrefix = 'ftr-remote:';
  defaultIndexString = 'logstash-*';

  public async initTests(isNewLibrary = false) {
    await this.kibanaServer.savedObjects.clean({ types: ['visualization'] });
    await this.kibanaServer.importExport.load(
      'test/functional/fixtures/kbn_archiver/visualize.json'
    );

    await this.kibanaServer.uiSettings.replace({
      defaultIndex: this.defaultIndexString,
      [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
      'visualization:visualize:legacyPieChartsLibrary': !isNewLibrary,
      'visualization:visualize:legacyHeatmapChartsLibrary': !isNewLibrary,
    });
  }

  public async gotoVisualizationLandingPage() {
    await this.common.navigateToApp('visualize');
  }

  public async clickNewVisualization() {
    await this.listingTable.clickNewButton('createVisualizationPromptButton');
  }

  public async clickAggBasedVisualizations() {
    await this.testSubjects.click('visGroupAggBasedExploreLink');
  }

  public async goBackToGroups() {
    await this.testSubjects.click('goBackLink');
  }

  public async createVisualizationPromptButton() {
    await this.testSubjects.click('createVisualizationPromptButton');
  }

  public async getChartTypes() {
    const chartTypeField = await this.testSubjects.find('visNewDialogTypes');
    const $ = await chartTypeField.parseDomContent();
    return $('button')
      .toArray()
      .map((chart) => $(chart).findTestSubject('visTypeTitle').text().trim());
  }

  public async getPromotedVisTypes() {
    const chartTypeField = await this.testSubjects.find('visNewDialogGroups');
    const $ = await chartTypeField.parseDomContent();
    const promotedVisTypes: string[] = [];
    $('button')
      .toArray()
      .forEach((chart) => {
        const title = $(chart).findTestSubject('visTypeTitle').text().trim();
        if (title) {
          promotedVisTypes.push(title);
        }
      });
    return promotedVisTypes;
  }

  public async waitForVisualizationSelectPage() {
    await this.retry.try(async () => {
      const visualizeSelectTypePage = await this.testSubjects.find('visNewDialogTypes');
      if (!(await visualizeSelectTypePage.isDisplayed())) {
        throw new Error('wait for visualization select page');
      }
    });
  }

  public async clickRefresh(isNewChartLibrary = false) {
    if ((await this.visChart.isNewChartsLibraryEnabled()) || isNewChartLibrary) {
      await this.elasticChart.setNewChartUiDebugFlag();
    }
    await this.queryBar.clickQuerySubmitButton();
  }

  public async waitForGroupsSelectPage() {
    await this.retry.try(async () => {
      const visualizeSelectGroupStep = await this.testSubjects.find('visNewDialogGroups');
      if (!(await visualizeSelectGroupStep.isDisplayed())) {
        throw new Error('wait for vis groups select step');
      }
    });
  }

  public async navigateToNewVisualization() {
    await this.gotoVisualizationLandingPage();
    await this.header.waitUntilLoadingHasFinished();
    await this.clickNewVisualization();
    await this.waitForGroupsSelectPage();
  }

  public async navigateToNewAggBasedVisualization() {
    await this.gotoVisualizationLandingPage();
    await this.header.waitUntilLoadingHasFinished();
    await this.clickNewVisualization();
    await this.clickAggBasedVisualizations();
    await this.waitForVisualizationSelectPage();
  }

  public async hasVisType(type: string) {
    return await this.testSubjects.exists(`visType-${type}`);
  }

  public async clickVisType(type: string) {
    await this.testSubjects.click(`visType-${type}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickAreaChart() {
    await this.clickVisType('area');
  }

  public async clickDataTable() {
    await this.clickVisType('table');
  }

  public async clickLineChart() {
    await this.clickVisType('line');
  }

  public async clickMarkdownWidget() {
    await this.clickVisType('markdown');
  }

  public async clickMetric() {
    await this.clickVisType('metric');
  }

  public async clickGauge() {
    await this.clickVisType('gauge');
  }

  public async clickPieChart() {
    await this.clickVisType('pie');
  }

  public async clickTimelion() {
    await this.clickVisType('timelion');
  }

  public async clickTagCloud() {
    await this.clickVisType('tagcloud');
  }

  public async clickVega() {
    await this.clickVisType('vega');
  }

  public async clickVisualBuilder() {
    await this.clickVisType('metrics');
  }

  public async clickVerticalBarChart() {
    await this.clickVisType('histogram');
  }

  public async clickHeatmapChart() {
    await this.clickVisType('heatmap');
  }

  public async clickInputControlVis() {
    await this.clickVisType('input_control_vis');
  }

  public async clickLensWidget() {
    await this.clickVisType('lens');
  }

  public async clickMapsApp() {
    await this.clickVisType('maps');
  }

  public async hasMapsApp() {
    return await this.hasVisType('maps');
  }

  public async createSimpleMarkdownViz(vizName: string) {
    await this.gotoVisualizationLandingPage();
    await this.navigateToNewVisualization();
    await this.clickMarkdownWidget();
    await this.visEditor.setMarkdownTxt(vizName);
    await this.visEditor.clickGo();
    await this.saveVisualization(vizName);
  }

  public async clickNewSearch(indexPattern = this.index.LOGSTASH_TIME_BASED) {
    await this.testSubjects.click(`savedObjectTitle${indexPattern.split(' ').join('-')}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async selectVisSourceIfRequired() {
    this.log.debug('selectVisSourceIfRequired');
    const selectPage = await this.testSubjects.findAll('visualizeSelectSearch');
    if (selectPage.length) {
      this.log.debug('a search is required for this visualization');
      await this.clickNewSearch();
    }
  }

  /**
   * Deletes all existing visualizations
   */
  public async deleteAllVisualizations() {
    await this.retry.try(async () => {
      await this.listingTable.checkListingSelectAllCheckbox();
      await this.listingTable.clickDeleteSelected();
      await this.common.clickConfirmOnModal();
      await this.testSubjects.find('createVisualizationPromptButton');
    });
  }

  public async isBetaInfoShown() {
    return await this.testSubjects.exists('betaVisInfo');
  }

  public async getBetaTypeLinks() {
    return await this.find.allByCssSelector('[data-vis-stage="beta"]');
  }

  public async getExperimentalTypeLinks() {
    return await this.find.allByCssSelector('[data-vis-stage="experimental"]');
  }

  public async isExperimentalInfoShown() {
    return await this.testSubjects.exists('experimentalVisInfo');
  }

  public async getExperimentalInfo() {
    return await this.testSubjects.find('experimentalVisInfo');
  }

  public async getSideEditorExists() {
    return await this.find.existsByCssSelector('.visEditor__collapsibleSidebar');
  }

  public async clickSavedSearch(savedSearchName: string) {
    await this.testSubjects.click(`savedObjectTitle${savedSearchName.split(' ').join('-')}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickUnlinkSavedSearch() {
    await this.testSubjects.click('showUnlinkSavedSearchPopover');
    await this.testSubjects.click('unlinkSavedSearch');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async ensureSavePanelOpen() {
    this.log.debug('ensureSavePanelOpen');
    await this.header.waitUntilLoadingHasFinished();
    const isOpen = await this.testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
    if (!isOpen) {
      await this.testSubjects.click('visualizeSaveButton');
    }
  }

  public async clickLoadSavedVisButton() {
    // TODO: Use a test subject selector once we rewrite breadcrumbs to accept each breadcrumb
    // element as a child instead of building the breadcrumbs dynamically.
    await this.find.clickByCssSelector('[href="#/"]');
  }

  public async loadSavedVisualization(vizName: string, { navigateToVisualize = true } = {}) {
    if (navigateToVisualize) {
      await this.clickLoadSavedVisButton();
    }
    await this.listingTable.searchForItemWithName(vizName);
    await this.openSavedVisualization(vizName);
  }

  public async openSavedVisualization(vizName: string) {
    const dataTestSubj = `visListingTitleLink-${vizName.split(' ').join('-')}`;
    await this.retry.try(async () => {
      await this.testSubjects.click(dataTestSubj, 20000);
      await this.notOnLandingPageOrFail();
    });
    await this.header.waitUntilLoadingHasFinished();
  }

  public async waitForVisualizationSavedToastGone() {
    await this.testSubjects.waitForDeleted('saveVisualizationSuccess');
  }

  public async clickLandingPageBreadcrumbLink() {
    this.log.debug('clickLandingPageBreadcrumbLink');
    await this.find.clickByCssSelector(`a[href="#${VisualizeConstants.LANDING_PAGE_PATH}"]`);
  }

  /**
   * Returns true if already on the landing page (that page doesn't have a link to itself).
   * @returns {Promise<boolean>}
   */
  public async onLandingPage() {
    this.log.debug(`VisualizePage.onLandingPage`);
    return await this.testSubjects.exists('visualizationLandingPage');
  }

  public async notOnLandingPageOrFail() {
    this.log.debug(`VisualizePage.notOnLandingPageOrFail`);
    return await this.testSubjects.missingOrFail('visualizationLandingPage');
  }

  public async gotoLandingPage() {
    this.log.debug('VisualizePage.gotoLandingPage');
    const onPage = await this.onLandingPage();
    if (!onPage) {
      await this.retry.try(async () => {
        await this.clickLandingPageBreadcrumbLink();
        const onLandingPage = await this.onLandingPage();
        if (!onLandingPage) throw new Error('Not on the landing page.');
      });
    }
  }

  public async saveVisualization(vizName: string, saveModalArgs: VisualizeSaveModalArgs = {}) {
    await this.ensureSavePanelOpen();

    await this.setSaveModalValues(vizName, saveModalArgs);
    this.log.debug('Click Save Visualization button');

    await this.testSubjects.click('confirmSaveSavedObjectButton');

    // Confirm that the Visualization has actually been saved
    await this.testSubjects.existOrFail('saveVisualizationSuccess');
    const message = await this.common.closeToast();
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForSaveModalToClose();

    return message;
  }

  public async setSaveModalValues(
    vizName: string,
    { saveAsNew, redirectToOrigin, addToDashboard, dashboardId }: VisualizeSaveModalArgs = {}
  ) {
    await this.testSubjects.setValue('savedObjectTitle', vizName);

    const saveAsNewCheckboxExists = await this.testSubjects.exists('saveAsNewCheckbox');
    if (saveAsNewCheckboxExists) {
      const state = saveAsNew ? 'check' : 'uncheck';
      this.log.debug('save as new checkbox exists. Setting its state to', state);
      await this.testSubjects.setEuiSwitch('saveAsNewCheckbox', state);
    }

    const redirectToOriginCheckboxExists = await this.testSubjects.exists(
      'returnToOriginModeSwitch'
    );
    if (redirectToOriginCheckboxExists) {
      const state = redirectToOrigin ? 'check' : 'uncheck';
      this.log.debug('redirect to origin checkbox exists. Setting its state to', state);
      await this.testSubjects.setEuiSwitch('returnToOriginModeSwitch', state);
    }

    const dashboardSelectorExists = await this.testSubjects.exists('add-to-dashboard-options');
    if (dashboardSelectorExists) {
      let option: DashboardPickerOption = 'add-to-library-option';
      if (addToDashboard) {
        option = dashboardId ? 'existing-dashboard-option' : 'new-dashboard-option';
      }
      this.log.debug('save modal dashboard selector, choosing option:', option);
      const dashboardSelector = await this.testSubjects.find('add-to-dashboard-options');
      const label = await dashboardSelector.findByCssSelector(`label[for="${option}"]`);
      await label.click();

      if (dashboardId) {
        // TODO - selecting an existing dashboard
      }
    }
  }

  public async saveVisualizationExpectSuccess(
    vizName: string,
    { saveAsNew, redirectToOrigin, addToDashboard, dashboardId }: VisualizeSaveModalArgs = {}
  ) {
    const saveMessage = await this.saveVisualization(vizName, {
      saveAsNew,
      redirectToOrigin,
      addToDashboard,
      dashboardId,
    });
    if (!saveMessage) {
      throw new Error(
        `Expected saveVisualization to respond with the saveMessage from the toast, got ${saveMessage}`
      );
    }
  }

  public async saveVisualizationExpectSuccessAndBreadcrumb(
    vizName: string,
    { saveAsNew = false, redirectToOrigin = false } = {}
  ) {
    await this.saveVisualizationExpectSuccess(vizName, { saveAsNew, redirectToOrigin });
    await this.retry.waitFor(
      'last breadcrumb to have new vis name',
      async () => (await this.globalNav.getLastBreadcrumb()) === vizName
    );
  }

  public async saveVisualizationAndReturn() {
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.existOrFail('visualizesaveAndReturnButton');
    await this.testSubjects.click('visualizesaveAndReturnButton');
  }

  public async getDeprecationWarningStatus() {
    if (await this.visChart.isNewChartsLibraryEnabled()) {
      await this.testSubjects.missingOrFail('vizDeprecationWarning');
    } else {
      await this.testSubjects.existOrFail('vizDeprecationWarning');
    }
  }

  public async linkedToOriginatingApp() {
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.existOrFail('visualizesaveAndReturnButton');
  }

  public async notLinkedToOriginatingApp() {
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.missingOrFail('visualizesaveAndReturnButton');
  }

  public async cancelAndReturn(showConfirmModal: boolean) {
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.existOrFail('visualizeCancelAndReturnButton');
    await this.testSubjects.click('visualizeCancelAndReturnButton');
    if (showConfirmModal) {
      await this.retry.waitFor(
        'confirm modal to show',
        async () => await this.testSubjects.exists('appLeaveConfirmModal')
      );
      await this.testSubjects.exists('confirmModalConfirmButton');
      await this.testSubjects.click('confirmModalConfirmButton');
    }
  }
}
