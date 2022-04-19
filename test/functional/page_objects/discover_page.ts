/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class DiscoverPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly header = this.ctx.getPageObject('header');
  private readonly browser = this.ctx.getService('browser');
  private readonly globalNav = this.ctx.getService('globalNav');
  private readonly elasticChart = this.ctx.getService('elasticChart');
  private readonly docTable = this.ctx.getService('docTable');
  private readonly config = this.ctx.getService('config');
  private readonly dataGrid = this.ctx.getService('dataGrid');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  private readonly defaultFindTimeout = this.config.get('timeouts.find');

  public async getChartTimespan() {
    return await this.testSubjects.getAttribute('discoverChart', 'data-time-range');
  }

  public async getDocTable() {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      return this.docTable;
    } else {
      return this.dataGrid;
    }
  }

  public async findFieldByName(name: string) {
    const fieldSearch = await this.testSubjects.find('fieldFilterSearchInput');
    await fieldSearch.type(name);
  }

  public async clearFieldSearchInput() {
    const fieldSearch = await this.testSubjects.find('fieldFilterSearchInput');
    await fieldSearch.clearValue();
  }

  public async saveSearch(searchName: string, saveAsNew?: boolean) {
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

  public async getCurrentQueryName() {
    return await this.globalNav.getLastBreadcrumb();
  }

  public async isChartVisible() {
    return await this.testSubjects.exists('discoverChart');
  }

  public async toggleChartVisibility() {
    await this.testSubjects.click('discoverChartOptionsToggle');
    await this.testSubjects.exists('discoverChartToggle');
    await this.testSubjects.click('discoverChartToggle');
    await this.header.waitUntilLoadingHasFinished();
  }

  public async getChartInterval() {
    await this.testSubjects.click('discoverChartOptionsToggle');
    await this.testSubjects.click('discoverTimeIntervalPanel');
    const selectedOption = await this.find.byCssSelector(`.discoverIntervalSelected`);
    return selectedOption.getVisibleText();
  }

  public async getChartIntervalWarningIcon() {
    await this.testSubjects.click('discoverChartOptionsToggle');
    await this.header.waitUntilLoadingHasFinished();
    return await this.find.existsByCssSelector('.euiToolTipAnchor');
  }

  public async setChartInterval(interval: string) {
    await this.testSubjects.click('discoverChartOptionsToggle');
    await this.testSubjects.click('discoverTimeIntervalPanel');
    await this.testSubjects.click(`discoverTimeInterval-${interval}`);
    return await this.header.waitUntilLoadingHasFinished();
  }

  public async getHitCount() {
    await this.header.waitUntilLoadingHasFinished();
    return await this.testSubjects.getVisibleText('discoverQueryHits');
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

  public async getDocTableIndex(index: number) {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      const row = await this.find.byCssSelector(`tr.kbnDocTable__row:nth-child(${index})`);
      return await row.getVisibleText();
    }

    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(row.map(async (cell) => await cell.getVisibleText()));
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
    const row = await this.dataGrid.getRow({ rowIndex: index - 1 });
    const result = await Promise.all(row.map(async (cell) => await cell.getVisibleText()));
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

  public async getAllFieldNames() {
    const sidebar = await this.testSubjects.find('discover-sidebar');
    const $ = await sidebar.parseDomContent();
    return $('.dscSidebarField__name')
      .toArray()
      .map((field) => $(field).text());
  }

  public async editField(field: string) {
    await this.retry.try(async () => {
      await this.testSubjects.click(`field-${field}`);
      await this.testSubjects.click(`discoverFieldListPanelEdit-${field}`);
      await this.find.byClassName('indexPatternFieldEditor__form');
    });
  }

  public async removeField(field: string) {
    await this.testSubjects.click(`field-${field}`);
    await this.testSubjects.click(`discoverFieldListPanelDelete-${field}`);
    await this.testSubjects.existOrFail('runtimeFieldDeleteConfirmModal');
  }

  public async clickIndexPatternActions() {
    await this.retry.try(async () => {
      await this.testSubjects.click('discoverIndexPatternActions');
      await this.testSubjects.existOrFail('discover-addRuntimeField-popover');
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

  public async hasNoResults() {
    return await this.testSubjects.exists('discoverNoResults');
  }

  public async hasNoResultsTimepicker() {
    return await this.testSubjects.exists('discoverNoResultsTimefilter');
  }

  public async clickFieldListItem(field: string) {
    return await this.testSubjects.click(`field-${field}`);
  }

  public async clickFieldSort(field: string, text = 'Sort New-Old') {
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      return await this.testSubjects.click(`docTableHeaderFieldSort_${field}`);
    }
    return await this.dataGrid.clickDocSortAsc(field, text);
  }

  public async clickFieldListItemToggle(field: string) {
    await this.testSubjects.moveMouseTo(`field-${field}`);
    await this.testSubjects.click(`fieldToggle-${field}`);
  }

  public async clickFieldListItemAdd(field: string) {
    // a filter check may make sense here, but it should be properly handled to make
    // it work with the _score and _source fields as well
    if (await this.isFieldSelected(field)) {
      return;
    }
    await this.clickFieldListItemToggle(field);
    const isLegacyDefault = await this.useLegacyTable();
    if (isLegacyDefault) {
      await this.retry.waitFor(`field ${field} to be added to classic table`, async () => {
        return await this.testSubjects.exists(`docTableHeader-${field}`);
      });
    } else {
      await this.retry.waitFor(`field ${field} to be added to new table`, async () => {
        return await this.testSubjects.exists(`dataGridHeaderCell-${field}`);
      });
    }
  }

  public async isFieldSelected(field: string) {
    if (!(await this.testSubjects.exists('fieldList-selected'))) {
      return false;
    }
    const selectedList = await this.testSubjects.find('fieldList-selected');
    return await this.testSubjects.descendantExists(`field-${field}`, selectedList);
  }

  public async clickFieldListItemRemove(field: string) {
    if (
      !(await this.testSubjects.exists('fieldList-selected')) ||
      !(await this.isFieldSelected(field))
    ) {
      return;
    }

    await this.clickFieldListItemToggle(field);
  }

  public async clickFieldListItemVisualize(fieldName: string) {
    const field = await this.testSubjects.find(`field-${fieldName}-showDetails`);
    const isActive = await field.elementHasClass('dscSidebarItem--active');

    if (!isActive) {
      // expand the field to show the "Visualize" button
      await field.click();
    }

    await this.testSubjects.click(`fieldVisualize-${fieldName}`);
  }

  public async expectFieldListItemVisualize(field: string) {
    await this.testSubjects.existOrFail(`fieldVisualize-${field}`);
  }

  public async expectMissingFieldListItemVisualize(field: string) {
    await this.testSubjects.missingOrFail(`fieldVisualize-${field}`);
  }

  public async clickFieldListPlusFilter(field: string, value: string) {
    const plusFilterTestSubj = `plus-${field}-${value}`;
    if (!(await this.testSubjects.exists(plusFilterTestSubj))) {
      // field has to be open
      await this.clickFieldListItem(field);
    }
    // this.testSubjects.find doesn't handle spaces in the data-test-subj value
    await this.testSubjects.click(plusFilterTestSubj);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickFieldListMinusFilter(field: string, value: string) {
    // this method requires the field details to be open from clickFieldListItem()
    // this.testSubjects.find doesn't handle spaces in the data-test-subj value
    await this.testSubjects.click(`minus-${field}-${value}`);
    await this.header.waitUntilLoadingHasFinished();
  }

  public async selectIndexPattern(indexPattern: string) {
    await this.testSubjects.click('indexPattern-switch-link');
    await this.find.setValue('[data-test-subj="indexPattern-switcher"] input', indexPattern);
    await this.find.clickByCssSelector(
      `[data-test-subj="indexPattern-switcher"] [title="${indexPattern}"]`
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

  public async openSidebarFieldFilter() {
    await this.testSubjects.click('toggleFieldFilterButton');
    await this.testSubjects.existOrFail('filterSelectionPanel');
  }

  public async closeSidebarFieldFilter() {
    await this.testSubjects.click('toggleFieldFilterButton');

    await this.retry.waitFor('sidebar filter closed', async () => {
      return !(await this.testSubjects.exists('filterSelectionPanel'));
    });
  }

  public async waitForChartLoadingComplete(renderCount: number) {
    await this.elasticChart.waitForRenderingCount(renderCount, 'discoverChart');
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
    await this.testSubjects.click('saved-query-management-popover-button');
  }

  public async clickCurrentSavedQuery() {
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
      await this.testSubjects.clickWhenNotDisabled('dscViewModeFieldStatsButton');
      await this.testSubjects.existOrFail('dscFieldStatsEmbeddedContent');
    });
  }

  public async getCurrentlySelectedDataView() {
    await this.testSubjects.existOrFail('discover-sidebar');
    const button = await this.testSubjects.find('indexPattern-switch-link');
    return button.getAttribute('title');
  }
}
