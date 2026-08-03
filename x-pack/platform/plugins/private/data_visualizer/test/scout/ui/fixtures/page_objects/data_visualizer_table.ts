/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface DataVisualizerTableRow {
  type: string;
  fieldName: string;
  documentsCount: string;
  distinctValues: string;
  distribution: string;
}

export class DataVisualizerTable {
  private readonly loadedTable: Locator;
  private readonly searchPanel: Locator;
  private readonly fieldNameSelect: Locator;
  private readonly fieldTypeSelect: Locator;
  private readonly showEmptyFieldsSwitch: Locator;
  private readonly paginationButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.loadedTable = this.page.testSubj.locator('~dataVisualizerTable-loaded');
    this.searchPanel = this.page.testSubj.locator('dataVisualizerSearchPanel');
    this.fieldNameSelect = this.page.testSubj.locator('dataVisualizerFieldNameSelect');
    this.fieldTypeSelect = this.page.testSubj.locator('dataVisualizerFieldTypeSelect');
    this.showEmptyFieldsSwitch = this.page.testSubj.locator('dataVisualizerShowEmptyFieldsSwitch');
    this.paginationButton = this.page.testSubj.locator(
      'dataVisualizerTableContainer > tablePaginationPopoverButton'
    );
  }

  rowSelector(fieldName: string, subSelector?: string) {
    const row = `~dataVisualizerTableContainer > ~row-${fieldName}`;
    return subSelector ? `${row} > ${subSelector}` : row;
  }

  detailsSelector(fieldName: string, subSelector?: string) {
    const row = `~dataVisualizerTableContainer > ~dataVisualizerFieldExpandedRow-${fieldName}`;
    return subSelector ? `${row} > ${subSelector}` : row;
  }

  async parseDataVisualizerTable(): Promise<DataVisualizerTableRow[]> {
    await this.loadedTable.waitFor({ state: 'visible' });

    return this.page.evaluate(() => {
      const getCellText = (row: Element, testSubj: string) => {
        const cell = row.querySelector(`[data-test-subj="${testSubj}"] .euiTableCellContent`);
        return cell?.textContent?.trim() ?? '';
      };

      return Array.from(document.querySelectorAll('[data-test-subj*="dataVisualizerRow"]')).map(
        (row) => ({
          type: getCellText(row, 'dataVisualizerTableColumnType'),
          fieldName: getCellText(row, 'dataVisualizerTableColumnName'),
          documentsCount: getCellText(row, 'dataVisualizerTableColumnDocumentsCount'),
          distinctValues: getCellText(row, 'dataVisualizerTableColumnDistinctValues'),
          distribution: getCellText(row, 'dataVisualizerTableColumnDistribution'),
        })
      );
    });
  }

  async waitForRow(fieldName: string, options?: { timeout?: number }) {
    await this.page.testSubj.locator(this.rowSelector(fieldName)).waitFor({
      state: 'visible',
      timeout: options?.timeout ?? 30_000,
    });
  }

  async waitForRowHidden(fieldName: string, options?: { timeout?: number }) {
    await this.page.testSubj.locator(this.rowSelector(fieldName)).waitFor({
      state: 'hidden',
      timeout: options?.timeout ?? 30_000,
    });
  }

  async getDisplayName(fieldName: string) {
    return this.page.testSubj
      .locator(this.rowSelector(fieldName, `dataVisualizerDisplayName-${fieldName}`))
      .innerText();
  }

  async ensureDetailsOpen(fieldName: string) {
    const details = this.page.testSubj.locator(this.detailsSelector(fieldName));

    if (await details.isVisible()) {
      return;
    }

    const expandToggle = this.page.testSubj.locator(
      this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-chevronSingleRight`)
    );
    await expandToggle.hover();
    await expandToggle.click();
    await this.page.testSubj
      .locator(
        this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-chevronSingleDown`)
      )
      .waitFor({ state: 'visible', timeout: 10_000 });
    await details.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async ensureDetailsClosed(fieldName: string) {
    const details = this.page.testSubj.locator(this.detailsSelector(fieldName));

    if (!(await details.isVisible())) {
      return;
    }

    await this.page.testSubj
      .locator(
        this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-chevronSingleDown`)
      )
      .click();
    await this.page.testSubj
      .locator(
        this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-chevronSingleRight`)
      )
      .waitFor({ state: 'visible', timeout: 10_000 });
    await details.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  async getFieldDocCount(fieldName: string) {
    const text = await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerTableColumnDocumentsCount'))
      .innerText();
    return (
      text
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean) ?? text.trim()
    );
  }

  async ensureAllMenuPopoversClosed() {
    await this.page.keyboard.press('Escape');
    await this.page.locator('.euiContextMenuPanel').waitFor({ state: 'hidden' });
  }

  async ensureActionsMenuOpen(fieldName: string) {
    await this.ensureAllMenuPopoversClosed();
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'euiCollapsedItemActionsButton'))
      .click();
    await this.page.locator('.euiContextMenuPanel').waitFor({ state: 'visible', timeout: 30_000 });
  }

  async waitForActionsMenuClosed(_fieldName: string, action: string) {
    await this.page.testSubj.locator(action).waitFor({ state: 'hidden', timeout: 30_000 });
  }

  isActionMenuViewInLensEnabled(_fieldName: string) {
    return this.page
      .locator('.euiContextMenuItem[data-test-subj="dataVisualizerActionViewInLensButton"]')
      .isEnabled();
  }

  isActionMenuDeleteIndexPatternFieldButtonEnabled(_fieldName: string) {
    return this.page
      .locator(
        '[data-test-subj="dataVisualizerActionDeleteIndexPatternFieldButton"][class="euiContextMenuItem"]'
      )
      .isEnabled();
  }

  async clickActionMenuDeleteIndexPatternFieldButton(fieldName: string) {
    const testSubj = 'dataVisualizerActionDeleteIndexPatternFieldButton';
    await this.ensureActionsMenuOpen(fieldName);
    await this.page.locator(`.euiContextMenuItem[data-test-subj="${testSubj}"]`).click();
    await this.waitForActionsMenuClosed(fieldName, testSubj);
    await this.page.testSubj
      .locator('runtimeFieldDeleteConfirmModal')
      .waitFor({ state: 'visible' });
  }

  isViewInLensActionEnabled(fieldName: string) {
    return this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton'))
      .isEnabled();
  }

  async waitForViewInLensActionHidden(fieldName: string) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton'))
      .waitFor({ state: 'hidden' });
  }

  async clickEditIndexPatternFieldButton(fieldName: string) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerActionEditIndexPatternFieldButton'))
      .click();
    await this.page.testSubj.locator('indexPatternFieldEditorForm').waitFor({ state: 'visible' });
  }

  async waitForFieldDistinctValues(fieldName: string) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerTableColumnDistinctValues'))
      .waitFor({ state: 'visible' });
  }

  async waitForFieldDistribution(fieldName: string) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerTableColumnDistribution'))
      .waitFor({ state: 'visible' });
  }

  async waitForSearchPanel() {
    await this.searchPanel.waitFor({ state: 'visible' });
  }

  async waitForFieldNameInput() {
    await this.fieldNameSelect.waitFor({ state: 'visible' });
  }

  async waitForFieldTypeInput() {
    await this.fieldTypeSelect.waitFor({ state: 'visible' });
  }

  private async setMultiSelectFilter(testDataSubj: string, values: string[]) {
    await this.page.keyboard.press('Escape');
    await this.page.testSubj.locator(`${testDataSubj}-button`).click();
    await this.page.testSubj.locator(`${testDataSubj}-popover`).waitFor({ state: 'visible' });
    const searchInput = this.page.testSubj.locator(`${testDataSubj}-searchInput`);

    for (const value of values) {
      await searchInput.fill('');
      await searchInput.pressSequentially(value);

      const checkedOption = this.page.testSubj.locator(`${testDataSubj}-option-${value}-checked`);
      if (!(await checkedOption.isVisible())) {
        await this.page.testSubj.locator(`${testDataSubj}-option-${value}`).click();
        await checkedOption.waitFor({ state: 'visible', timeout: 5000 });
      }
    }

    await this.page.keyboard.press('Escape');
  }

  private async removeMultiSelectFilter(testDataSubj: string, values: string[]) {
    await this.page.testSubj.locator(`${testDataSubj}-button`).click();
    await this.page.testSubj.locator(`${testDataSubj}-popover`).waitFor({ state: 'visible' });
    const searchInput = this.page.testSubj.locator(`${testDataSubj}-searchInput`);

    for (const value of values) {
      await searchInput.fill('');
      await searchInput.pressSequentially(value);

      const uncheckedOption = this.page.testSubj.locator(`${testDataSubj}-option-${value}`);
      if (!(await uncheckedOption.isVisible())) {
        await this.page.testSubj.locator(`${testDataSubj}-option-${value}-checked`).click();
        await uncheckedOption.waitFor({ state: 'visible', timeout: 5000 });
      }
    }

    await this.page.keyboard.press('Escape');
  }

  async setFieldTypeFilter(fieldTypes: string[]) {
    await this.waitForFieldTypeInput();
    await this.setMultiSelectFilter('dataVisualizerFieldTypeSelect', fieldTypes);
  }

  async removeFieldTypeFilter(fieldTypes: string[]) {
    await this.waitForFieldTypeInput();
    await this.removeMultiSelectFilter('dataVisualizerFieldTypeSelect', fieldTypes);
  }

  async setFieldNameFilter(fieldNames: string[]) {
    await this.waitForFieldNameInput();
    await this.setMultiSelectFilter('dataVisualizerFieldNameSelect', fieldNames);
  }

  async removeFieldNameFilter(fieldNames: string[]) {
    await this.waitForFieldNameInput();
    await this.removeMultiSelectFilter('dataVisualizerFieldNameSelect', fieldNames);
  }

  async waitForShowEmptyFieldsSwitch() {
    await this.showEmptyFieldsSwitch.waitFor({ state: 'visible' });
  }

  async getShowEmptyFieldsCheckState() {
    const checked = await this.showEmptyFieldsSwitch.getAttribute('aria-checked');
    return checked === 'true';
  }

  async setShowEmptyFieldsSwitchState(checkState: boolean) {
    await this.waitForShowEmptyFieldsSwitch();

    if ((await this.getShowEmptyFieldsCheckState()) !== checkState) {
      await this.showEmptyFieldsSwitch.click();
    }

    await expect.poll(async () => this.getShowEmptyFieldsCheckState()).toBe(checkState);
  }

  detailsLocator(fieldName: string, subSelector: string) {
    return this.page.testSubj.locator(this.detailsSelector(fieldName, subSelector));
  }

  async getTopValuesBarTexts(fieldName: string) {
    await this.ensureDetailsOpen(fieldName);

    const bars = this.page.testSubj
      .locator(this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValuesContent'))
      .locator('[data-test-subj="dataVisualizerFieldDataTopValueBar"]');
    const innerTexts = await bars.allInnerTexts();
    return innerTexts.map((text) => text.split('\n')[0].trim());
  }

  async getTopValuesCount(fieldName: string) {
    await this.ensureDetailsOpen(fieldName);
    return this.page.testSubj
      .locator(this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValuesContent'))
      .locator('[data-test-subj="dataVisualizerFieldDataTopValueBar"]')
      .count();
  }

  async waitForDistributionPreview(fieldName: string) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, `dataVisualizerDataGridChart-${fieldName}`))
      .waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, `dataVisualizerDataGridChart-${fieldName}-histogram`))
      .waitFor({ state: 'visible' });
  }

  async getExamplesListCount(fieldName: string) {
    const examplesList = this.page.testSubj.locator(
      this.detailsSelector(fieldName, 'dataVisualizerFieldDataExamplesList')
    );
    return examplesList.locator('li').count();
  }

  async clickLensActionShowChart(
    fieldName: string,
    visualizationContainer = 'lnsVisualizationContainer'
  ) {
    await this.page.testSubj
      .locator(this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton'))
      .click();
    await this.page.testSubj.locator(visualizationContainer).waitFor({
      state: 'visible',
      timeout: 15_000,
    });
  }

  async ensureNumRowsPerPageIfNeeded(n?: 10 | 25 | 50) {
    if (n === undefined) {
      return;
    }

    await this.ensureNumRowsPerPage(n);
  }

  async ensureNumRowsPerPage(n: 10 | 25 | 50) {
    await this.paginationButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.paginationButton.click();
    await this.page.testSubj.locator(`tablePagination-${n}-rows`).click();

    await expect
      .poll(async () => {
        const text = await this.paginationButton.innerText();
        return text.split(': ')[1]?.trim();
      })
      .toBe(n.toString());
  }
}
