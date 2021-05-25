/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function DiscoverPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const flyout = getService('flyout');
  const { header } = getPageObjects(['header']);
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const elasticChart = getService('elasticChart');
  const docTable = getService('docTable');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');
  const dataGrid = getService('dataGrid');
  const kibanaServer = getService('kibanaServer');

  class DiscoverPage {
    public async getChartTimespan() {
      const el = await find.byCssSelector('[data-test-subj="discoverIntervalDateRange"]');
      return await el.getVisibleText();
    }

    public async getDocTable() {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        return docTable;
      } else {
        return dataGrid;
      }
    }

    public async findFieldByName(name: string) {
      const fieldSearch = await testSubjects.find('fieldFilterSearchInput');
      await fieldSearch.type(name);
    }

    public async clearFieldSearchInput() {
      const fieldSearch = await testSubjects.find('fieldFilterSearchInput');
      await fieldSearch.clearValue();
    }

    public async saveSearch(searchName: string) {
      await this.clickSaveSearchButton();
      // preventing an occasional flakiness when the saved object wasn't set and the form can't be submitted
      await retry.waitFor(
        `saved search title is set to ${searchName} and save button is clickable`,
        async () => {
          const saveButton = await testSubjects.find('confirmSaveSavedObjectButton');
          await testSubjects.setValue('savedObjectTitle', searchName);
          return (await saveButton.getAttribute('disabled')) !== 'true';
        }
      );
      await testSubjects.click('confirmSaveSavedObjectButton');
      await header.waitUntilLoadingHasFinished();
      // LeeDr - this additional checking for the saved search name was an attempt
      // to cause this method to wait for the reloading of the page to complete so
      // that the next action wouldn't have to retry.  But it doesn't really solve
      // that issue.  But it does typically take about 3 retries to
      // complete with the expected searchName.
      await retry.waitFor(`saved search was persisted with name ${searchName}`, async () => {
        return (await this.getCurrentQueryName()) === searchName;
      });
    }

    public async inputSavedSearchTitle(searchName: string) {
      await testSubjects.setValue('savedObjectTitle', searchName);
    }

    public async clickConfirmSavedSearch() {
      await testSubjects.click('confirmSaveSavedObjectButton');
    }

    public async openAddFilterPanel() {
      await testSubjects.click('addFilter');
    }

    public async waitUntilSearchingHasFinished() {
      await testSubjects.missingOrFail('loadingSpinner', { timeout: defaultFindTimeout * 10 });
    }

    public async getColumnHeaders() {
      const isLegacy = await this.useLegacyTable();
      if (isLegacy) {
        return await docTable.getHeaderFields('embeddedSavedSearchDocTable');
      }
      const table = await this.getDocTable();
      return await table.getHeaderFields();
    }

    public async openLoadSavedSearchPanel() {
      let isOpen = await testSubjects.exists('loadSearchForm');
      if (isOpen) {
        return;
      }

      // We need this try loop here because previous actions in Discover like
      // saving a search cause reloading of the page and the "Open" menu item goes stale.
      await retry.waitFor('saved search panel is opened', async () => {
        await this.clickLoadSavedSearchButton();
        await header.waitUntilLoadingHasFinished();
        isOpen = await testSubjects.exists('loadSearchForm');
        return isOpen === true;
      });
    }

    public async closeLoadSaveSearchPanel() {
      await flyout.ensureClosed('loadSearchForm');
    }

    public async hasSavedSearch(searchName: string) {
      const searchLink = await find.byButtonText(searchName);
      return await searchLink.isDisplayed();
    }

    public async loadSavedSearch(searchName: string) {
      await this.openLoadSavedSearchPanel();
      await testSubjects.click(`savedObjectTitle${searchName.split(' ').join('-')}`);
      await header.waitUntilLoadingHasFinished();
    }

    public async clickNewSearchButton() {
      await testSubjects.click('discoverNewButton');
      await header.waitUntilLoadingHasFinished();
    }

    public async clickSaveSearchButton() {
      await testSubjects.click('discoverSaveButton');
    }

    public async clickLoadSavedSearchButton() {
      await testSubjects.moveMouseTo('discoverOpenButton');
      await testSubjects.click('discoverOpenButton');
    }

    public async clickResetSavedSearchButton() {
      await testSubjects.moveMouseTo('resetSavedSearch');
      await testSubjects.click('resetSavedSearch');
      await header.waitUntilLoadingHasFinished();
    }

    public async closeLoadSavedSearchPanel() {
      await testSubjects.click('euiFlyoutCloseButton');
    }

    public async clickHistogramBar() {
      await elasticChart.waitForRenderComplete();
      const el = await elasticChart.getCanvas();

      await browser.getActions().move({ x: 0, y: 0, origin: el._webElement }).click().perform();
    }

    public async brushHistogram() {
      await elasticChart.waitForRenderComplete();
      const el = await elasticChart.getCanvas();

      await browser.dragAndDrop(
        { location: el, offset: { x: -300, y: 20 } },
        { location: el, offset: { x: -100, y: 30 } }
      );
    }

    public async getCurrentQueryName() {
      return await globalNav.getLastBreadcrumb();
    }

    public async getChartInterval() {
      const selectedValue = await testSubjects.getAttribute('discoverIntervalSelect', 'value');
      const selectedOption = await find.byCssSelector(`option[value="${selectedValue}"]`);
      return selectedOption.getVisibleText();
    }

    public async getChartIntervalWarningIcon() {
      await header.waitUntilLoadingHasFinished();
      return await find.existsByCssSelector('.euiToolTipAnchor');
    }

    public async setChartInterval(interval: string) {
      const optionElement = await find.byCssSelector(`option[label="${interval}"]`, 5000);
      await optionElement.click();
      return await header.waitUntilLoadingHasFinished();
    }

    public async getHitCount() {
      await header.waitUntilLoadingHasFinished();
      return await testSubjects.getVisibleText('discoverQueryHits');
    }

    public async getDocHeader() {
      const table = await this.getDocTable();
      const docHeader = await table.getHeaders();
      return docHeader.join();
    }

    public async getDocTableRows() {
      await header.waitUntilLoadingHasFinished();
      const table = await this.getDocTable();
      return await table.getBodyRows();
    }

    public async useLegacyTable() {
      return (await kibanaServer.uiSettings.get('doc_table:legacy')) !== false;
    }

    public async getDocTableIndex(index: number) {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        const row = await find.byCssSelector(`tr.kbnDocTable__row:nth-child(${index})`);
        return await row.getVisibleText();
      }

      const row = await dataGrid.getRow({ rowIndex: index - 1 });
      const result = await Promise.all(row.map(async (cell) => await cell.getVisibleText()));
      // Remove control columns
      return result.slice(2).join(' ');
    }

    public async getDocTableIndexLegacy(index: number) {
      const row = await find.byCssSelector(`tr.kbnDocTable__row:nth-child(${index})`);
      return await row.getVisibleText();
    }

    public async getDocTableField(index: number, cellIdx: number = -1) {
      const isLegacyDefault = await this.useLegacyTable();
      const usedDefaultCellIdx = isLegacyDefault ? 0 : 2;
      const usedCellIdx = cellIdx === -1 ? usedDefaultCellIdx : cellIdx;
      if (isLegacyDefault) {
        const fields = await find.allByCssSelector(
          `tr.kbnDocTable__row:nth-child(${index}) [data-test-subj='docTableField']`
        );
        return await fields[usedCellIdx].getVisibleText();
      }
      const row = await dataGrid.getRow({ rowIndex: index - 1 });
      const result = await Promise.all(row.map(async (cell) => await cell.getVisibleText()));
      return result[usedCellIdx];
    }

    public async skipToEndOfDocTable() {
      // add the focus to the button to make it appear
      const skipButton = await testSubjects.find('discoverSkipTableButton');
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
      const skipButton = await testSubjects.find('discoverBackToTop');
      return skipButton.click();
    }

    public async getDocTableFooter() {
      return await testSubjects.find('discoverDocTableFooter');
    }

    public async clickDocSortDown() {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        await find.clickByCssSelector('.fa-sort-down');
      } else {
        await dataGrid.clickDocSortAsc();
      }
    }

    public async clickDocSortUp() {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        await find.clickByCssSelector('.fa-sort-up');
      } else {
        await dataGrid.clickDocSortDesc();
      }
    }

    public async isShowingDocViewer() {
      return await testSubjects.exists('kbnDocViewer');
    }

    public async getMarks() {
      const table = await docTable.getTable();
      const marks = await table.findAllByTagName('mark');
      return await Promise.all(marks.map((mark) => mark.getVisibleText()));
    }

    public async toggleSidebarCollapse() {
      return await testSubjects.click('collapseSideBarButton');
    }

    public async getAllFieldNames() {
      const sidebar = await testSubjects.find('discover-sidebar');
      const $ = await sidebar.parseDomContent();
      return $('.dscSidebarField__name')
        .toArray()
        .map((field) => $(field).text());
    }

    public async editField(field: string) {
      await retry.try(async () => {
        await testSubjects.click(`field-${field}`);
        await testSubjects.click(`discoverFieldListPanelEdit-${field}`);
        await find.byClassName('indexPatternFieldEditor__form');
      });
    }

    public async removeField(field: string) {
      await testSubjects.click(`field-${field}`);
      await testSubjects.click(`discoverFieldListPanelDelete-${field}`);
      await testSubjects.existOrFail('runtimeFieldDeleteConfirmModal');
    }

    public async clickIndexPatternActions() {
      await retry.try(async () => {
        await testSubjects.click('discoverIndexPatternActions');
        await testSubjects.existOrFail('discover-addRuntimeField-popover');
      });
    }

    public async clickAddNewField() {
      await retry.try(async () => {
        await testSubjects.click('indexPattern-add-field');
        await find.byClassName('indexPatternFieldEditor__form');
      });
    }

    public async hasNoResults() {
      return await testSubjects.exists('discoverNoResults');
    }

    public async hasNoResultsTimepicker() {
      return await testSubjects.exists('discoverNoResultsTimefilter');
    }

    public async clickFieldListItem(field: string) {
      return await testSubjects.click(`field-${field}`);
    }

    public async clickFieldSort(field: string, text = 'Sort New-Old') {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        return await testSubjects.click(`docTableHeaderFieldSort_${field}`);
      }
      return await dataGrid.clickDocSortAsc(field, text);
    }

    public async clickFieldListItemToggle(field: string) {
      await testSubjects.moveMouseTo(`field-${field}`);
      await testSubjects.click(`fieldToggle-${field}`);
    }

    public async clickFieldListItemAdd(field: string) {
      // a filter check may make sense here, but it should be properly handled to make
      // it work with the _score and _source fields as well
      await this.clickFieldListItemToggle(field);
    }

    public async clickFieldListItemRemove(field: string) {
      if (!(await testSubjects.exists('fieldList-selected'))) {
        return;
      }
      const selectedList = await testSubjects.find('fieldList-selected');
      if (await testSubjects.descendantExists(`field-${field}`, selectedList)) {
        await this.clickFieldListItemToggle(field);
      }
    }

    public async clickFieldListItemVisualize(fieldName: string) {
      const field = await testSubjects.find(`field-${fieldName}-showDetails`);
      const isActive = await field.elementHasClass('dscSidebarItem--active');

      if (!isActive) {
        // expand the field to show the "Visualize" button
        await field.click();
      }

      await testSubjects.click(`fieldVisualize-${fieldName}`);
    }

    public async expectFieldListItemVisualize(field: string) {
      await testSubjects.existOrFail(`fieldVisualize-${field}`);
    }

    public async expectMissingFieldListItemVisualize(field: string) {
      await testSubjects.missingOrFail(`fieldVisualize-${field}`);
    }

    public async clickFieldListPlusFilter(field: string, value: string) {
      const plusFilterTestSubj = `plus-${field}-${value}`;
      if (!(await testSubjects.exists(plusFilterTestSubj))) {
        // field has to be open
        await this.clickFieldListItem(field);
      }
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      await testSubjects.click(plusFilterTestSubj);
      await header.waitUntilLoadingHasFinished();
    }

    public async clickFieldListMinusFilter(field: string, value: string) {
      // this method requires the field details to be open from clickFieldListItem()
      // testSubjects.find doesn't handle spaces in the data-test-subj value
      await testSubjects.click(`minus-${field}-${value}`);
      await header.waitUntilLoadingHasFinished();
    }

    public async selectIndexPattern(indexPattern: string) {
      await testSubjects.click('indexPattern-switch-link');
      await find.setValue('[data-test-subj="indexPattern-switcher"] input', indexPattern);
      await find.clickByCssSelector(
        `[data-test-subj="indexPattern-switcher"] [title="${indexPattern}"]`
      );
      await header.waitUntilLoadingHasFinished();
    }

    public async removeHeaderColumn(name: string) {
      const isLegacyDefault = await this.useLegacyTable();
      if (isLegacyDefault) {
        await testSubjects.moveMouseTo(`docTableHeader-${name}`);
        await testSubjects.click(`docTableRemoveHeader-${name}`);
      } else {
        await dataGrid.clickRemoveColumn(name);
      }
    }

    public async openSidebarFieldFilter() {
      await testSubjects.click('toggleFieldFilterButton');
      await testSubjects.existOrFail('filterSelectionPanel');
    }

    public async closeSidebarFieldFilter() {
      await testSubjects.click('toggleFieldFilterButton');
      await testSubjects.missingOrFail('filterSelectionPanel');
    }

    public async waitForChartLoadingComplete(renderCount: number) {
      await elasticChart.waitForRenderingCount(renderCount, 'discoverChart');
    }

    public async waitForDocTableLoadingComplete() {
      await testSubjects.waitForAttributeToChange(
        'discoverDocTable',
        'data-render-complete',
        'true'
      );
    }
    public async getNrOfFetches() {
      const el = await find.byCssSelector('[data-fetch-counter]');
      const nr = await el.getAttribute('data-fetch-counter');
      return Number(nr);
    }

    /**
     * Check if Discover app is currently rendered on the screen.
     */
    public async isDiscoverAppOnScreen(): Promise<boolean> {
      const result = await find.allByCssSelector('discover-app');
      return result.length === 1;
    }

    /**
     * Wait until Discover app is rendered on the screen.
     */
    public async waitForDiscoverAppOnScreen() {
      await retry.waitFor('Discover app on screen', async () => {
        return await this.isDiscoverAppOnScreen();
      });
    }

    public async showAllFilterActions() {
      await testSubjects.click('showFilterActions');
    }

    public async clickSavedQueriesPopOver() {
      await testSubjects.click('saved-query-management-popover-button');
    }

    public async clickCurrentSavedQuery() {
      await testSubjects.click('saved-query-management-save-button');
    }

    public async setSaveQueryFormTitle(savedQueryName: string) {
      await testSubjects.setValue('saveQueryFormTitle', savedQueryName);
    }

    public async toggleIncludeFilters() {
      await testSubjects.click('saveQueryFormIncludeFiltersOption');
    }

    public async saveCurrentSavedQuery() {
      await testSubjects.click('savedQueryFormSaveButton');
    }

    public async deleteSavedQuery() {
      await testSubjects.click('delete-saved-query-TEST-button');
    }

    public async confirmDeletionOfSavedQuery() {
      await testSubjects.click('confirmModalConfirmButton');
    }

    public async clearSavedQuery() {
      await testSubjects.click('saved-query-management-clear-button');
    }
  }

  return new DiscoverPage();
}
