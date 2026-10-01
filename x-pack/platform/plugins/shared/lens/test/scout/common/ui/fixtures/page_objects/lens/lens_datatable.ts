/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { parseInlineStyle, WAIT_FOR_FUNCTION_TIMEOUT_MS } from './lens_editor_helpers';

/**
 * Lens datatable cell / header reading helpers.
 */
export class LensDatatable {
  private readonly dataTable;

  constructor(private readonly page: ScoutPage) {
    this.dataTable = this.page.testSubj.locator('lnsDataTable');
  }

  /**
   * Locator for a Lens datatable cell. Prefer `expect(locator).toContainText(...)`
   * over polling + `getCellText` when asserting visible values.
   */
  getCellLocator(rowIndex = 0, colIndex = 0, addRowNumberColumn = true) {
    const col = colIndex + (addRowNumberColumn ? 1 : 0);
    return this.dataTable.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-index="${col}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
  }

  getHeaderLocator(name: string) {
    return this.dataTable.getByRole('columnheader', { name });
  }

  async filterOutCell(rowIndex = 0, colIndex = 0): Promise<void> {
    const cell = this.getCellLocator(rowIndex, colIndex);
    await cell.hover();

    const filterOutButton = cell.getByTestId('lensDatatableFilterOut');
    await filterOutButton.click();
  }

  private cell(rowIndex: number, colIndex: number, addRowNumberColumn: boolean) {
    return this.getCellLocator(rowIndex, colIndex, addRowNumberColumn);
  }

  async getCellText(rowIndex = 0, colIndex = 0, addRowNumberColumn = true): Promise<string> {
    const cell = this.cell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    // EUI data grid can append expand/filter glyphs (↵, ↦) / extra whitespace in innerText.
    return ((await cell.innerText()) ?? '')
      .replace(/[\u21b5\u21a6\u2192]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getCellStyle(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<Record<string, string>> {
    const cell = this.cell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    return parseInlineStyle((await cell.getAttribute('style')) ?? '');
  }

  async getCountOfColumns(): Promise<number> {
    // FTR parity: EuiDataGrid has no per-column test subj for content cells; `.euiDataGridHeaderCell__content`
    // excludes the leading control column (same selector as FTR `getCountOfColumns`).
    return this.dataTable.locator('.euiDataGridHeaderCell__content').count();
  }

  async getHeaderText(index = 0): Promise<string> {
    // Prefer content nodes — columnheader innerText can include action glyphs like ↵.
    // Index matches getCountOfColumns (control column excluded).
    // FTR parity: EUI class selector until Lens exposes header content test subjects.
    const headers = this.dataTable.locator('.euiDataGridHeaderCell__content');
    await this.page.waitForFunction(
      ({ minCount }) =>
        document.querySelectorAll('[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content')
          .length > minCount,
      { minCount: index },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const headerContents = await headers.all();
    const headerContent = headerContents[index];
    if (!headerContent) {
      throw new Error(`Datatable header not found at index ${index}`);
    }
    return (await headerContent.innerText()).replace(/\s+/g, ' ').trim();
  }
}
