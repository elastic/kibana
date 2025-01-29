/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class DiscoverPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly header = this.ctx.getPageObject('header');
  private readonly dataViews = this.ctx.getService('dataViews');
  private readonly unifiedFieldList = this.ctx.getPageObject('unifiedFieldList');
  private readonly browser = this.ctx.getService('browser');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly config = this.ctx.getService('config');
  private readonly dataGrid = this.ctx.getService('dataGrid');
  private readonly fieldEditor = this.ctx.getService('fieldEditor');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly savedObjectsFinder = this.ctx.getService('savedObjectsFinder');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  /** Ensures that navigation to discover has completed */
  public async expectOnDiscover() {
    await this.testSubjects.existOrFail('discoverNewButton');
    await this.testSubjects.existOrFail('discoverOpenButton');
  }

  public async getChartTimespan() {
    return await this.testSubjects.getAttribute('unifiedHistogramChart', 'data-time-range');
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
    return await this.dataGrid.getHeaderFields();
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
    await this.savedObjectsFinder.filterEmbeddableNames(`"${searchName.replace('-', ' ')}"`);
    await this.testSubjects.click(`savedObjectTitle${searchName.split(' ').join('-')}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickNewSearchButton() {
    await this.testSubjects.click('discoverNewButton');
    await this.testSubjects.moveMouseTo('unifiedFieldListSidebar__toggle-collapse'); // cancel tooltips
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickSaveSearchButton() {
    await this.testSubjects.click('discoverSaveButton');
  }

  public async clickLoadSavedSearchButton() {
    await this.testSubjects.moveMouseTo('discoverOpenButton');
    await this.testSubjects.click('discoverOpenButton');
  }

  public async revertUnsavedChanges() {
    await this.testSubjects.moveMouseTo('unsavedChangesBadge');
    await this.testSubjects.click('unsavedChangesBadge');
    await this.retry.waitFor('popover is open', async () => {
      return Boolean(await this.testSubjects.find('unsavedChangesBadgeMenuPanel'));
    });
    await this.testSubjects.click('revertUnsavedChangesButton');
    await this.header.waitUntilLoadingHasFinished();
    await this.waitUntilSearchingHasFinished();
  }

  public async saveUnsavedChanges() {
    await this.testSubjects.moveMouseTo('unsavedChangesBadge');
    await this.testSubjects.click('unsavedChangesBadge');
    await this.retry.waitFor('popover is open', async () => {
      return Boolean(await this.testSubjects.find('unsavedChangesBadgeMenuPanel'));
    });
    await this.testSubjects.click('saveUnsavedChangesButton');
    await this.retry.waitFor('modal is open', async () => {
      return Boolean(await this.testSubjects.find('confirmSaveSavedObjectButton'));
    });
    await this.testSubjects.click('confirmSaveSavedObjectButton');
    await this.header.waitUntilLoadingHasFinished();
    await this.waitUntilSearchingHasFinished();
  }

  public async closeLoadSavedSearchPanel() {
    await this.testSubjects.click('euiFlyoutCloseButton');
  }

  public async clickHistogramBar() {
    await this.elasticChart.waitForRenderComplete(undefined, 5000);
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

  public async getBreakdownFieldValue() {
    const breakdownButton = await this.testSubjects.find('unifiedHistogramBreakdownSelectorButton');

    return breakdownButton.getVisibleText();
  }

  public async chooseBreakdownField(field: string, value?: string) {
    await this.retry.try(async () => {
      await this.testSubjects.click('unifiedHistogramBreakdownSelectorButton');
      await this.testSubjects.existOrFail('unifiedHistogramBreakdownSelectorSelectable');
    });

    await (
      await this.testSubjects.find('unifiedHistogramBreakdownSelectorSelectorSearch')
    ).type(field);

    const option = await this.find.byCssSelector(
      `[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"] .euiSelectableListItem[value="${
        value ?? field
      }"]`
    );
    await option.click();
  }

  public async clearBreakdownField() {
    await this.chooseBreakdownField('No breakdown', '__EMPTY_SELECTOR_OPTION__');
  }

  public async chooseLensSuggestion(suggestionType: string) {
    await this.testSubjects.click('discoverQueryTotalHits'); // cancel any tooltips which might hide the edit button
    await this.testSubjects.click('unifiedHistogramEditFlyoutVisualization');
    await this.retry.waitFor('flyout', async () => {
      return await this.testSubjects.exists('lensSuggestionsPanelToggleButton');
    });
    await this.testSubjects.click('lensSuggestionsPanelToggleButton');

    const suggestionTestSubj = `lnsSuggestion-${suggestionType}`;
    await this.retry.waitFor('suggestion option', async () => {
      return await this.testSubjects.exists(suggestionTestSubj);
    });
    await this.testSubjects.click(suggestionTestSubj);
    await this.retry.waitFor('suggestion option to get selected', async () => {
      return (
        (await (
          await this.testSubjects.find(`${suggestionTestSubj} > lnsSuggestion`)
        ).getAttribute('aria-current')) === 'true'
      );
    });

    await this.testSubjects.scrollIntoView('applyFlyoutButton');
    await this.testSubjects.click('applyFlyoutButton');
  }

  public async getVisContextSuggestionType() {
    return await this.testSubjects.getAttribute('unifiedHistogramChart', 'data-suggestion-type');
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
    if (await this.isChartVisible()) {
      await this.testSubjects.click('dscHideHistogramButton');
    } else {
      await this.testSubjects.click('dscShowHistogramButton');
    }
    await this.header.waitUntilLoadingHasFinished();
  }

  public async openHistogramPanel() {
    await this.testSubjects.click('dscShowHistogramButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async closeHistogramPanel() {
    await this.testSubjects.click('dscHideHistogramButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getChartInterval() {
    const button = await this.testSubjects.find('unifiedHistogramTimeIntervalSelectorButton');
    return await button.getAttribute('data-selected-value');
  }

  public async getChartIntervalWarningIcon() {
    await this.header.waitUntilLoadingHasFinished();
    return await this.find.existsByCssSelector(
      '[data-test-subj="unifiedHistogramRendered"] .euiToolTipAnchor'
    );
  }

  public async setChartInterval(intervalTitle: string) {
    await this.retry.try(async () => {
      await this.testSubjects.click('unifiedHistogramTimeIntervalSelectorButton');
      await this.testSubjects.existOrFail('unifiedHistogramTimeIntervalSelectorSelectable');
    });

    const option = await this.find.byCssSelector(
      `[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"] .euiSelectableListItem[title="${intervalTitle}"]`
    );
    await option.click();
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async getHitCount({ isPartial }: { isPartial?: boolean } = {}) {
    await this.header.waitUntilLoadingHasFinished();
    return await this.testSubjects.getVisibleText(
      isPartial ? 'discoverQueryHitsPartial' : 'discoverQueryHits'
    );
  }

  public async getHitCountInt() {
    return parseInt(await this.getHitCount(), 10);
  }

  public async getSavedSearchDocumentCount() {
    return await this.testSubjects.getVisibleText('savedSearchTotalDocuments');
  }

  public async getDocHeader() {
    const docHeader = await this.dataGrid.getHeaders();
    return docHeader.join();
  }

  public async getDocTableRows() {
    await this.header.waitUntilLoadingHasFinished();
    return await this.dataGrid.getBodyRows();
  }

  public async getDocTableIndex(index: number, visibleText = false) {
    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(
      row.map(async (cell) => {
        if (visibleText) {
          return await cell.getVisibleText();
        } else {
          const textContent = await cell.getAttribute('textContent');
          return textContent?.trim();
        }
      })
    );
    // Remove control columns
    return result.slice(await this.dataGrid.getControlColumnsCount()).join(' ');
  }

  public async getDocTableField(index: number, cellIdx: number = -1) {
    const usedDefaultCellIdx = await this.dataGrid.getControlColumnsCount();
    const usedCellIdx = cellIdx === -1 ? usedDefaultCellIdx : cellIdx;

    await this.testSubjects.click('dataGridFullScreenButton');
    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(row.map(async (cell) => (await cell.getVisibleText()).trim()));
    await this.testSubjects.click('dataGridFullScreenButton');
    return result[usedCellIdx];
  }

  public isShowingDocViewer() {
    return this.dataGrid.isShowingDocViewer();
  }

  public clickDocViewerTab(id: string) {
    return this.dataGrid.clickDocViewerTab(id);
  }

  public async expectSourceViewerToExist() {
    return await this.find.byClassName('monaco-editor');
  }

  public async findFieldByNameOrValueInDocViewer(name: string) {
    const fieldSearch = await this.testSubjects.find('unifiedDocViewerFieldsSearchInput');
    await fieldSearch.type(name);
  }

  public async openFilterByFieldTypeInDocViewer() {
    await this.testSubjects.click('unifiedDocViewerFieldsTableFieldTypeFilterToggle');
    await this.testSubjects.existOrFail('unifiedDocViewerFieldsTableFieldTypeFilterOptions');
  }

  public async closeFilterByFieldTypeInDocViewer() {
    await this.testSubjects.click('unifiedDocViewerFieldsTableFieldTypeFilterToggle');

    await this.retry.waitFor('doc viewer filter closed', async () => {
      return !(await this.testSubjects.exists('unifiedDocViewerFieldsTableFieldTypeFilterOptions'));
    });
  }

  public async getMarks() {
    const table = await this.dataGrid.getTable();
    const marks = await table.findAllByTagName('mark');
    return await Promise.all(marks.map((mark) => mark.getVisibleText()));
  }

  public async openSidebar() {
    await this.testSubjects.click('dscShowSidebarButton');

    await this.retry.waitFor('sidebar to appear', async () => {
      return await this.isSidebarPanelOpen();
    });
  }

  public async closeSidebar() {
    await this.retry.tryForTime(2 * 1000, async () => {
      await this.testSubjects.click('unifiedFieldListSidebar__toggle-collapse');
      await this.testSubjects.missingOrFail('unifiedFieldListSidebar__toggle-collapse');
      await this.testSubjects.missingOrFail('fieldList');
    });
  }

  public async isSidebarPanelOpen() {
    return (
      (await this.testSubjects.exists('fieldList')) &&
      (await this.testSubjects.exists('unifiedFieldListSidebar__toggle-collapse'))
    );
  }

  public async editField(field: string) {
    await this.retry.try(async () => {
      await this.unifiedFieldList.pressEnterFieldListItemToggle(field);
      await this.testSubjects.pressEnter(`discoverFieldListPanelEdit-${field}`);
      await this.find.byClassName('indexPatternFieldEditor__form');
    });
  }

  public async removeField(field: string) {
    await this.unifiedFieldList.pressEnterFieldListItemToggle(field);
    await this.testSubjects.pressEnter(`discoverFieldListPanelDelete-${field}`);
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

  public async hasNoResults() {
    return await this.testSubjects.exists('discoverNoResults');
  }

  public async hasNoResultsTimepicker() {
    return await this.testSubjects.exists('discoverNoResultsTimefilter');
  }

  public async showsErrorCallout() {
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('discoverErrorCalloutTitle');
    });
  }

  public getDiscoverErrorMessage() {
    return this.testSubjects.getVisibleText('discoverErrorCalloutMessage');
  }

  public async expandTimeRangeAsSuggestedInNoResultsMessage() {
    await this.retry.waitFor('the button before pressing it', async () => {
      return await this.testSubjects.exists('discoverNoResultsViewAllMatches');
    });
    await this.retry.waitForWithTimeout('view all matches to load', 60000, async () => {
      try {
        // We need to manually click the button since testSubjects.click will
        // use a retry, but we want this to throw if the click fails since it
        // means the button disappeared before we could click it
        const button = await this.testSubjects.find('discoverNoResultsViewAllMatches', 1000);
        // Don't click the button if it's disabled since it means the previous
        // click succeeded and the request is still loading
        if (await button.isEnabled()) {
          await button.click();
        }
      } catch {
        // We could get an exception here if the button isn't found or isn't in
        // the DOM by the time we try to click it, so just ignore it and move on
      }
      await this.waitUntilSearchingHasFinished();
      await this.header.waitUntilLoadingHasFinished();
      return !(await this.testSubjects.exists('discoverNoResultsViewAllMatches'));
    });
  }

  public async clickFieldSort(field: string, text = 'Sort New-Old') {
    return await this.dataGrid.clickDocSortAsc(field, text);
  }

  public async selectIndexPattern(
    indexPattern: string,
    waitUntilLoadingHasFinished: boolean = true
  ) {
    await this.dataViews.switchTo(indexPattern);
    if (waitUntilLoadingHasFinished) {
      await this.header.waitUntilLoadingHasFinished();
    }
  }

  public async getIndexPatterns() {
    await this.testSubjects.click('discover-dataView-switch-link');
    const indexPatternSwitcher = await this.testSubjects.find('indexPattern-switcher');
    const li = await indexPatternSwitcher.findAllByTagName('li');
    const items = await Promise.all(li.map((lis) => lis.getVisibleText()));
    await this.testSubjects.click('discover-dataView-switch-link');
    return items;
  }

  public async selectTextBaseLang() {
    if (await this.testSubjects.exists('select-text-based-language-btn')) {
      await this.testSubjects.click('select-text-based-language-btn');
      await this.header.waitUntilLoadingHasFinished();
      await this.waitUntilSearchingHasFinished();
    }
  }

  public async removeHeaderColumn(name: string) {
    await this.dataGrid.clickRemoveColumn(name);
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
    await this.testSubjects.existOrFail('savedQueryFormSaveButton');
    await this.retry.try(async () => {
      if (await this.testSubjects.exists('savedQueryFormSaveButton')) {
        await this.testSubjects.click('savedQueryFormSaveButton');
      }
      await this.testSubjects.missingOrFail('queryBarMenuPanel');
    });
  }

  public async deleteSavedQuery() {
    await this.testSubjects.click('delete-saved-query-button');
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

  /**
   * Validates if data view references in the URL are equal.
   */
  public async validateDataViewReffsEquality() {
    const currentUrl = await this.browser.getCurrentUrl();
    const matches = currentUrl.matchAll(/dataViewId:[^,]*/g);
    const indexes = [];
    for (const matchEntry of matches) {
      const [index] = matchEntry;
      indexes.push(decodeURIComponent(index).replace('dataViewId:', '').replaceAll("'", ''));
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

  public async addRuntimeField(name: string, script: string, type?: string) {
    await this.dataViews.clickAddFieldFromSearchBar();
    await this.fieldEditor.setName(name);
    if (type) {
      await this.fieldEditor.setFieldType(type);
    }
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
      `[data-test-subj="dscFieldListPanelField-${fieldName}"] [data-test-subj="domDragDrop-keyboardHandler"]`
    );
    await field.focus();
    await this.retry.try(async () => {
      await this.browser.pressKeys(this.browser.keys.ENTER);
      await this.testSubjects.exists('.domDroppable--active'); // checks if we're in dnd mode and there's any drop target active
    });
    await this.browser.pressKeys(this.browser.keys.RIGHT);
    await this.browser.pressKeys(this.browser.keys.ENTER);
    await this.waitForDropToFinish();
  }
}
