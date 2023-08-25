/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

export class DiscoverPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly header = this.ctx.getPageObject('header');
  private readonly unifiedSearch = this.ctx.getPageObject('unifiedSearch');
  private readonly unifiedFieldList = this.ctx.getPageObject('unifiedFieldList');
  private readonly browser = this.ctx.getService('browser');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly docTable = this.ctx.getService('docTable');
  private readonly config = this.ctx.getService('config');
  private readonly dataGrid = this.ctx.getService('dataGrid');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly fieldEditor = this.ctx.getService('fieldEditor');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly comboBox = this.ctx.getService('comboBox');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  public async getChartTimespan() {
    return await this.testSubjects.getAttribute('unifiedHistogramChart', 'data-time-range');
  }

  public async getDocTable() {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      return this.docTable;
    } else {
      return this.dataGrid;
    }
  }

  public async saveSearch(
    searchName: string,
    saveAsNew?: boolean,
    options: { tags: string[] } = { tags: [] }
  ) {
    await this.clickSaveSearchButton();
    // preventing an occasional flakiness when the saved object wasn't set and the form can't be submitted
    await this.retry.waitFor(
      `saved search title is set to ${searchName} and save button is clickable`,
      async () => {
        const saveButton = await this.testSubjects.find('confirmSaveSavedObjectButton');
        await this.testSubjects.setValue('savedObjectTitle', searchName);
        return (await saveButton.getAttribute('disabled')) !== 'true';
      }
    );

    if (options.tags.length) {
      await this.testSubjects.click('savedObjectTagSelector');
      for (const tagName of options.tags) {
        await this.testSubjects.click(`tagSelectorOption-${tagName.replace(' ', '_')}`);
      }
      await this.testSubjects.click('savedObjectTitle');
    }

    if (saveAsNew !== undefined) {
      await this.retry.waitFor(`save as new switch is set`, async () => {
        await this.testSubjects.setEuiSwitch('saveAsNewCheckbox', saveAsNew ? 'check' : 'uncheck');
        return (await this.testSubjects.isEuiSwitchChecked('saveAsNewCheckbox')) === saveAsNew;
      });
    }

    await this.testSubjects.click('confirmSaveSavedObjectButton');
    await this.header.waitUntilLoadingHasFinished();
    // LeeDr - this additional checking for the saved search name was an attempt
    // to cause this method to wait for the reloading of the page to complete so
    // that the next action wouldn't have to retry.  But it doesn't really solve
    // that issue.  But it does typically take about 3 retries to
    // complete with the expected searchName.
    await this.retry.waitFor(`saved search was persisted with name ${searchName}`, async () => {
      return (await this.getCurrentQueryName()) === searchName;
    });
  }

  public async inputSavedSearchTitle(searchName: string) {
    await this.testSubjects.setValue('savedObjectTitle', searchName);
  }

  public async clickConfirmSavedSearch() {
    await this.testSubjects.click('confirmSaveSavedObjectButton');
  }

  public async openAddFilterPanel() {
    await this.testSubjects.click('addFilter');
  }

  public async closeAddFilterPanel() {
    await this.testSubjects.click('addFilter');
  }

  public async waitUntilSearchingHasFinished() {
    await this.testSubjects.missingOrFail('loadingSpinner', {
      timeout: this.defaultFindTimeout * 10,
    });
  }

  public async getColumnHeaders() {
    const isLegacy = await this.useLegacyTable();
    if (isLegacy) {
      return await this.docTable.getHeaderFields('embeddedSavedSearchDocTable');
    }
    const table = await this.getDocTable();
    return await table.getHeaderFields();
  }

  public async openLoadSavedSearchPanel() {
    let isOpen = await this.testSubjects.exists('loadSearchForm');
    if (isOpen) {
      return;
    }

    // We need this try loop here because previous actions in Discover like
    // saving a search cause reloading of the page and the "Open" menu item goes stale.
    await this.retry.waitFor('saved search panel is opened', async () => {
      await this.clickLoadSavedSearchButton();
      await this.header.waitUntilLoadingHasFinished();
      isOpen = await this.testSubjects.exists('loadSearchForm');
      return isOpen === true;
    });
  }

  public async closeLoadSaveSearchPanel() {
    await this.flyout.ensureClosed('loadSearchForm');
  }

  public async hasSavedSearch(searchName: string) {
    const searchLink = await this.find.byButtonText(searchName);
    return await searchLink.isDisplayed();
  }

  public async getSavedSearchTitle() {
    const breadcrumb = await this.find.byCssSelector('[data-test-subj="breadcrumb last"]');
    return await breadcrumb.getVisibleText();
  }

  public async loadSavedSearch(searchName: string) {
    await this.openLoadSavedSearchPanel();
    await this.testSubjects.click(`savedObjectTitle${searchName.split(' ').join('-')}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickNewSearchButton() {
    await this.testSubjects.click('discoverNewButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickSaveSearchButton() {
    await this.testSubjects.click('discoverSaveButton');
  }

  public async clickLoadSavedSearchButton() {
    await this.testSubjects.moveMouseTo('discoverOpenButton');
    await this.testSubjects.click('discoverOpenButton');
  }

  public async clickResetSavedSearchButton() {
    await this.testSubjects.moveMouseTo('resetSavedSearch');
    await this.testSubjects.click('resetSavedSearch');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async closeLoadSavedSearchPanel() {
    await this.testSubjects.click('euiFlyoutCloseButton');
  }

  public async clickHistogramBar() {
    await this.elasticChart.waitForRenderComplete();
    const el = await this.elasticChart.getCanvas();

    await this.browser.getActions().move({ x: 0, y: 0, origin: el._webElement }).click().perform();
  }

  public async brushHistogram() {
    await this.elasticChart.waitForRenderComplete();
    const el = await this.elasticChart.getCanvas();

    await this.browser.dragAndDrop(
      { location: el, offset: { x: -300, y: 20 } },
      { location: el, offset: { x: -100, y: 30 } }
    );
  }

  public async chooseBreakdownField(field: string) {
    await this.comboBox.set('unifiedHistogramBreakdownFieldSelector', field);
  }

  public async chooseLensChart(chart: string) {
    await this.comboBox.set('unifiedHistogramSuggestionSelector', chart);
  }

  public async getHistogramLegendList() {
    const unifiedHistogram = await this.testSubjects.find('unifiedHistogramChart');
    const list = await unifiedHistogram.findAllByClassName('echLegendItem__label');
    return Promise.all(list.map((elem: WebElementWrapper) => elem.getVisibleText()));
  }

  public async clickLegendFilter(field: string, type: '+' | '-') {
    const filterType = type === '+' ? 'filterIn' : 'filterOut';
    await this.testSubjects.click(`legend-${field}`);
    await this.testSubjects.click(`legend-${field}-${filterType}`);
  }

  public async getCurrentQueryName() {
    return await this.globalNav.getLastBreadcrumb();
  }

  public async isChartVisible() {
    return await this.testSubjects.exists('unifiedHistogramChart');
  }

  public async toggleChartVisibility() {
    await this.testSubjects.moveMouseTo('unifiedHistogramChartOptionsToggle');
    await this.testSubjects.click('unifiedHistogramChartOptionsToggle');
    await this.testSubjects.exists('unifiedHistogramChartToggle');
    await this.testSubjects.click('unifiedHistogramChartToggle');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getChartInterval() {
    await this.testSubjects.click('unifiedHistogramChartOptionsToggle');
    await this.testSubjects.click('unifiedHistogramTimeIntervalPanel');
    const selectedOption = await this.find.byCssSelector(`.unifiedHistogramIntervalSelected`);
    return selectedOption.getVisibleText();
  }

  public async getChartIntervalWarningIcon() {
    await this.testSubjects.click('unifiedHistogramChartOptionsToggle');
    await this.header.waitUntilLoadingHasFinished();
    return await this.find.existsByCssSelector('.euiToolTipAnchor');
  }

  public async setChartInterval(interval: string) {
    await this.testSubjects.click('unifiedHistogramChartOptionsToggle');
    await this.testSubjects.click('unifiedHistogramTimeIntervalPanel');
    await this.testSubjects.click(`unifiedHistogramTimeInterval-${interval}`);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async getHitCount() {
    await this.header.waitUntilLoadingHasFinished();
    return await this.testSubjects.getVisibleText('unifiedHistogramQueryHits');
  }

  public async getHitCountInt() {
    return parseInt(await this.getHitCount(), 10);
  }

  public async getSavedSearchDocumentCount() {
    return await this.testSubjects.getVisibleText('savedSearchTotalDocuments');
  }

  public async getDocHeader() {
    const table = await this.getDocTable();
    const docHeader = await table.getHeaders();
    return docHeader.join();
  }

  public async getDocTableRows() {
    await this.header.waitUntilLoadingHasFinished();
    const table = await this.getDocTable();
    return await table.getBodyRows();
  }

  public async useLegacyTable() {
    return (await this.kibanaServer.uiSettings.get('doc_table:legacy')) === true;
  }

  public async getDocTableIndex(index: number, visibleText = false) {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      const row = await this.find.byCssSelector(`tr.kbnDocTable__row:nth-child(${index})`);
      return await row.getVisibleText();
    }

    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(
      row.map(async (cell) => {
        if (visibleText) {
          return await cell.getVisibleText();
        } else {
          const textContent = await cell.getAttribute('textContent');
          return textContent.trim();
        }
      })
    );
    // Remove control columns
    return result.slice(2).join(' ');
  }

  public async getDocTableIndexLegacy(index: number) {
    const row = await this.find.byCssSelector(`tr.kbnDocTable__row:nth-child(${index})`);
    return await row.getVisibleText();
  }

  public async getDocTableField(index: number, cellIdx: number = -1) {
    const isLegacyDefault = await this.useLegacyTable();
    const usedDefaultCellIdx = isLegacyDefault ? 0 : 2;
    const usedCellIdx = cellIdx === -1 ? usedDefaultCellIdx : cellIdx;
    if (isLegacyDefault) {
      const fields = await this.find.allByCssSelector(
        `tr.kbnDocTable__row:nth-child(${index}) [data-test-subj='docTableField']`
      );
      return await fields[usedCellIdx].getVisibleText();
    }
    await this.testSubjects.click('dataGridFullScreenButton');
    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(row.map(async (cell) => (await cell.getVisibleText()).trim()));
    await this.testSubjects.click('dataGridFullScreenButton');
    return result[usedCellIdx];
  }

  public async clickDocTableRowToggle(rowIndex: number = 0) {
    const docTable = await this.getDocTable();
    await docTable.clickRowToggle({ rowIndex });
  }

  public async skipToEndOfDocTable() {
    // add the focus to the button to make it appear
    const skipButton = await this.testSubjects.find('discoverSkipTableButton');
    // force focus on it, to make it interactable
    skipButton.focus();
    // now click it!
    return skipButton.click();
  }

  /**
   * When scrolling down the legacy table there's a link to scroll up
   * So this is done by this function
   */
  public async backToTop() {
    const skipButton = await this.testSubjects.find('discoverBackToTop');
    return skipButton.click();
  }

  public async getDocTableFooter() {
    return await this.testSubjects.find('discoverDocTableFooter');
  }

  public async isShowingDocViewer() {
    return await this.testSubjects.exists('kbnDocViewer');
  }

  public async clickDocViewerTab(index: number) {
    return await this.find.clickByCssSelector(`#kbn_doc_viewer_tab_${index}`);
  }

  public async expectSourceViewerToExist() {
    return await this.find.byClassName('monaco-editor');
  }

  public async getMarks() {
    const table = await this.docTable.getTable();
    const marks = await table.findAllByTagName('mark');
    return await Promise.all(marks.map((mark) => mark.getVisibleText()));
  }

  public async toggleSidebarCollapse() {
    return await this.testSubjects.click('collapseSideBarButton');
  }

  public async closeSidebar() {
    await this.retry.tryForTime(2 * 1000, async () => {
      await this.toggleSidebarCollapse();
      await this.testSubjects.missingOrFail('discover-sidebar');
    });
  }

  public async editField(field: string) {
    await this.retry.try(async () => {
      await this.unifiedFieldList.clickFieldListItem(field);
      // Wait until the field stats popover is opened and loaded before
      // hitting the edit button, otherwise the click may occur at the
      // exact time the field stats load, triggering a layout shift, and
      // will result in the "filter for" button being clicked instead of
      // the edit button, causing test flakiness
      await this.unifiedFieldList.waitUntilFieldPopoverIsOpen();
      await this.unifiedFieldList.waitUntilFieldPopoverIsLoaded();
      await this.testSubjects.click(`discoverFieldListPanelEdit-${field}`);
      await this.find.byClassName('indexPatternFieldEditor__form');
    });
  }

  public async removeField(field: string) {
    await this.unifiedFieldList.clickFieldListItem(field);
    await this.testSubjects.click(`discoverFieldListPanelDelete-${field}`);
    await this.retry.waitFor('modal to open', async () => {
      return await this.testSubjects.exists('runtimeFieldDeleteConfirmModal');
    });
    await this.fieldEditor.confirmDelete();
  }

  public async clickIndexPatternActions() {
    await this.retry.try(async () => {
      await this.testSubjects.click('discover-dataView-switch-link');
    });
  }

  public async clickAddNewField() {
    await this.retry.try(async () => {
      await this.testSubjects.click('indexPattern-add-field');
      await this.find.byClassName('indexPatternFieldEditor__form');
    });
  }

  public async clickCreateNewDataView() {
    await this.retry.waitForWithTimeout('data create new to be visible', 15000, async () => {
      return await this.testSubjects.isDisplayed('dataview-create-new');
    });
    await this.testSubjects.click('dataview-create-new');
    await this.retry.waitForWithTimeout(
      'index pattern editor form to be visible',
      15000,
      async () => {
        return await (await this.find.byClassName('indexPatternEditor__form')).isDisplayed();
      }
    );
    await (await this.find.byClassName('indexPatternEditor__form')).click();
  }

  async createAdHocDataView(name: string, hasTimeField = false) {
    await this.testSubjects.click('discover-dataView-switch-link');
    await this.unifiedSearch.createNewDataView(name, true, hasTimeField);
    await this.retry.waitFor('flyout to get closed', async () => {
      return !(await this.testSubjects.exists('indexPatternEditor__form'));
    });
  }

  async clickAddField() {
    await this.testSubjects.click('discover-dataView-switch-link');
    await this.testSubjects.existOrFail('indexPattern-add-field');
    await this.testSubjects.click('indexPattern-add-field');
  }

  public async hasNoResults() {
    return await this.testSubjects.exists('discoverNoResults');
  }

  public async hasNoResultsTimepicker() {
    return await this.testSubjects.exists('discoverNoResultsTimefilter');
  }

  public noResultsErrorVisible() {
    return this.testSubjects.exists('discoverNoResultsError');
  }

  public mainErrorVisible() {
    return this.testSubjects.exists('discoverMainError');
  }

  public getDiscoverErrorMessage() {
    return this.testSubjects.getVisibleText('discoverErrorCalloutMessage');
  }

  public async expandTimeRangeAsSuggestedInNoResultsMessage() {
    await this.retry.waitFor('the button before pressing it', async () => {
      return await this.testSubjects.exists('discoverNoResultsViewAllMatches');
    });
    return await this.testSubjects.click('discoverNoResultsViewAllMatches');
  }

  public async clickFieldSort(field: string, text = 'Sort New-Old') {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      return await this.testSubjects.click(`docTableHeaderFieldSort_${field}`);
    }
    return await this.dataGrid.clickDocSortAsc(field, text);
  }

  public async isAdHocDataViewSelected() {
    const dataView = await this.getCurrentlySelectedDataView();
    await this.testSubjects.click('discover-dataView-switch-link');
    const hasBadge = await this.testSubjects.exists(`dataViewItemTempBadge-${dataView}`);
    await this.testSubjects.click('discover-dataView-switch-link');
    return hasBadge;
  }

  public async selectIndexPattern(indexPattern: string) {
    await this.testSubjects.click('discover-dataView-switch-link');
    await this.find.setValue('[data-test-subj="indexPattern-switcher"] input', indexPattern);
    await this.find.clickByCssSelector(
      `[data-test-subj="indexPattern-switcher"] [title="${indexPattern}"]`
    );
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getIndexPatterns() {
    await this.testSubjects.click('discover-dataView-switch-link');
    const indexPatternSwitcher = await this.testSubjects.find('indexPattern-switcher');
    const li = await indexPatternSwitcher.findAllByTagName('li');
    const items = await Promise.all(li.map((lis) => lis.getVisibleText()));
    await this.testSubjects.click('discover-dataView-switch-link');
    return items;
  }

  public async selectTextBaseLang(lang: 'SQL') {
    await this.testSubjects.click('discover-dataView-switch-link');
    await this.find.clickByCssSelector(
      `[data-test-subj="text-based-languages-switcher"] [title="${lang}"]`
    );
    await this.header.waitUntilLoadingHasFinished();
  }

  public async removeHeaderColumn(name: string) {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      await this.testSubjects.moveMouseTo(`docTableHeader-${name}`);
      await this.testSubjects.click(`docTableRemoveHeader-${name}`);
    } else {
      await this.dataGrid.clickRemoveColumn(name);
    }
  }

  public async waitForChartLoadingComplete(renderCount: number) {
    await this.elasticChart.waitForRenderingCount(renderCount, 'unifiedHistogramChart');
  }

  public async waitForDocTableLoadingComplete() {
    await this.testSubjects.waitForAttributeToChange(
      'discoverDocTable',
      'data-render-complete',
      'true'
    );
  }
  public async getNrOfFetches() {
    const el = await this.find.byCssSelector('[data-fetch-counter]');
    const nr = await el.getAttribute('data-fetch-counter');
    return Number(nr);
  }

  /**
   * Check if Discover app is currently rendered on the screen.
   */
  public async isDiscoverAppOnScreen(): Promise<boolean> {
    const result = await this.find.allByCssSelector('.dscPage');
    return result.length === 1;
  }

  /**
   * Wait until Discover app is rendered on the screen.
   */
  public async waitForDiscoverAppOnScreen() {
    await this.retry.waitFor('Discover app on screen', async () => {
      return await this.isDiscoverAppOnScreen();
    });
  }

  public async showAllFilterActions() {
    await this.testSubjects.click('showFilterActions');
  }

  public async clickSavedQueriesPopOver() {
    await this.testSubjects.click('showQueryBarMenu');
  }

  public async clickCurrentSavedQuery() {
    await this.queryBar.setQuery('Cancelled : true');
    await this.queryBar.clickQuerySubmitButton();
    await this.testSubjects.click('showQueryBarMenu');
    await this.testSubjects.click('saved-query-management-save-button');
  }

  public async setSaveQueryFormTitle(savedQueryName: string) {
    await this.testSubjects.setValue('saveQueryFormTitle', savedQueryName);
  }

  public async toggleIncludeFilters() {
    await this.testSubjects.click('saveQueryFormIncludeFiltersOption');
  }

  public async saveCurrentSavedQuery() {
    await this.testSubjects.click('savedQueryFormSaveButton');
  }

  public async deleteSavedQuery() {
    await this.testSubjects.click('delete-saved-query-TEST-button');
  }

  public async confirmDeletionOfSavedQuery() {
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  public async clearSavedQuery() {
    await this.testSubjects.click('saved-query-management-clear-button');
  }

  public async assertHitCount(expectedHitCount: string) {
    await this.retry.tryForTime(2 * 1000, async () => {
      // Close side bar to ensure Discover hit count shows
      // edge case for when browser width is small
      await this.closeSidebar();
      const hitCount = await this.getHitCount();
      expect(hitCount).to.eql(
        expectedHitCount,
        `Expected Discover hit count to be ${expectedHitCount} but got ${hitCount}.`
      );
    });
  }

  public async assertViewModeToggleNotExists() {
    await this.testSubjects.missingOrFail('dscViewModeToggle', { timeout: 2 * 1000 });
  }

  public async assertViewModeToggleExists() {
    await this.testSubjects.existOrFail('dscViewModeToggle', { timeout: 2 * 1000 });
  }

  public async assertFieldStatsTableNotExists() {
    await this.testSubjects.missingOrFail('dscFieldStatsEmbeddedContent', { timeout: 2 * 1000 });
  }

  public async clickViewModeFieldStatsButton() {
    await this.retry.tryForTime(2 * 1000, async () => {
      await this.testSubjects.existOrFail('dscViewModeFieldStatsButton');
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('dscViewModeFieldStatsButton');
      await this.testSubjects.existOrFail('dscFieldStatsEmbeddedContent');
    });
  }

  public async getCurrentlySelectedDataView() {
    await this.testSubjects.existOrFail('discover-sidebar');
    const button = await this.testSubjects.find('discover-dataView-switch-link');
    return button.getAttribute('title');
  }

  /**
   * Validates if data view references in the URL are equal.
   */
  public async validateDataViewReffsEquality() {
    const currentUrl = await this.browser.getCurrentUrl();
    const matches = currentUrl.matchAll(/index:[^,]*/g);
    const indexes = [];
    for (const matchEntry of matches) {
      const [index] = matchEntry;
      indexes.push(decodeURIComponent(index).replace('index:', '').replaceAll("'", ''));
    }

    const first = indexes[0];
    if (first) {
      const allEqual = indexes.every((val) => val === first);
      if (allEqual) {
        return { valid: true, result: first };
      } else {
        return {
          valid: false,
          message:
            'Discover URL state contains different index references. They should be all the same.',
        };
      }
    }
    return { valid: false, message: "Discover URL state doesn't contain an index reference." };
  }

  public async getCurrentDataViewId() {
    const validationResult = await this.validateDataViewReffsEquality();
    if (validationResult.valid) {
      return validationResult.result!;
    } else {
      throw new Error(validationResult.message);
    }
  }

  public async addRuntimeField(name: string, script: string) {
    await this.clickAddField();
    await this.fieldEditor.setName(name);
    await this.fieldEditor.enableValue();
    await this.fieldEditor.typeScript(script);
    await this.fieldEditor.save();
    await this.header.waitUntilLoadingHasFinished();
  }

  private async waitForDropToFinish() {
    await this.retry.try(async () => {
      const exists = await this.find.existsByCssSelector('.domDragDrop-isActiveGroup');
      if (exists) {
        throw new Error('UI still in drag/drop mode');
      }
    });
    await this.header.waitUntilLoadingHasFinished();
    await this.waitUntilSearchingHasFinished();
  }

  /**
   * Drags field to add as a column
   *
   * @param fieldName
   * */
  public async dragFieldToTable(fieldName: string) {
    await this.unifiedFieldList.waitUntilSidebarHasLoaded();

    const from = `dscFieldListPanelField-${fieldName}`;
    await this.find.existsByCssSelector(from);
    await this.browser.html5DragAndDrop(
      this.testSubjects.getCssSelector(from),
      this.testSubjects.getCssSelector('dscMainContent')
    );
    await this.waitForDropToFinish();
  }

  /**
   * Drags field with keyboard actions to add as a column
   *
   * @param fieldName
   * */
  public async dragFieldWithKeyboardToTable(fieldName: string) {
    const field = await this.find.byCssSelector(
      `[data-test-subj="domDragDrop_draggable-${fieldName}"] [data-test-subj="domDragDrop-keyboardHandler"]`
    );
    await field.focus();
    await this.retry.try(async () => {
      await this.browser.pressKeys(this.browser.keys.ENTER);
      await this.testSubjects.exists('.domDragDrop-isDropTarget'); // checks if we're in dnd mode and there's any drop target active
    });
    await this.browser.pressKeys(this.browser.keys.RIGHT);
    await this.browser.pressKeys(this.browser.keys.ENTER);
    await this.waitForDropToFinish();
  }
}
