/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chunk } from 'lodash';
import { FtrService } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';

export interface TabbedGridData {
  columns: string[];
  rows: string[][];
}
interface SelectOptions {
  isAnchorRow?: boolean;
  rowIndex?: number;
  renderMoreRows?: boolean;
}

export class DataGridService extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly header = this.ctx.getPageObject('header');
  private readonly retry = this.ctx.getService('retry');

  async getDataGridTableData(): Promise<TabbedGridData> {
    const table = await this.find.byCssSelector('.euiDataGrid');
    const $ = await table.parseDomContent();

    const columns = $('.euiDataGridHeaderCell__content')
      .toArray()
      .map((cell) => $(cell).text());
    const cells = $.findTestSubjects('dataGridRowCell')
      .toArray()
      .map((cell) => $(cell).text());

    const rows = chunk(cells, columns.length);

    return {
      columns,
      rows,
    };
  }

  /**
   * Converts the data grid data into nested array
   * [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
   * @param element table
   */
  public async getDataFromElement(
    element: WebElementWrapper,
    cellDataTestSubj: string
  ): Promise<string[][]> {
    const $ = await element.parseDomContent();
    const columnNumber = $('.euiDataGridHeaderCell__content').length;
    const cells = $.findTestSubjects('dataGridRowCell')
      .toArray()
      .map((cell) =>
        $(cell)
          .findTestSubject(cellDataTestSubj)
          .text()
          .replace(/&nbsp;/g, '')
          .trim()
      );

    return chunk(cells, columnNumber);
  }

  /**
   * Returns an array of data grid headers names
   */
  public async getHeaders() {
    const header = await this.testSubjects.find('euiDataGridBody > dataGridHeader');
    const $ = await header.parseDomContent();
    return $('.euiDataGridHeaderCell__content')
      .toArray()
      .map((cell) => $(cell).text());
  }

  private getCellElementSelector(rowIndex: number = 0, columnIndex: number = 0) {
    return `[data-test-subj="euiDataGridBody"] [data-test-subj="dataGridRowCell"][data-gridcell-column-index="${columnIndex}"][data-gridcell-row-index="${rowIndex}"]`;
  }

  /**
   * Returns a grid cell element by row & column indexes.
   * @param rowIndex data row index starting from 0 (0 means 1st row)
   * @param columnIndex column index starting from 0 (0 means 1st column)
   */
  public async getCellElement(rowIndex: number = 0, columnIndex: number = 0) {
    return await this.find.byCssSelector(this.getCellElementSelector(rowIndex, columnIndex));
  }

  /**
   * The same as getCellElement, but useful when multiple data grids are on the page.
   */
  public async getAllCellElements(rowIndex: number = 0, columnIndex: number = 0) {
    return await this.find.allByCssSelector(this.getCellElementSelector(rowIndex, columnIndex));
  }

  public async getDocCount(): Promise<number> {
    const grid = await this.find.byCssSelector('[data-document-number]');
    return Number(await grid.getAttribute('data-document-number'));
  }

  public async getFields(options?: SelectOptions) {
    const selector = options?.isAnchorRow
      ? '.euiDataGridRowCell.dscDocsGrid__cell--highlight'
      : '.euiDataGridRowCell';
    const cells = await this.find.allByCssSelector(selector);

    const rows: string[][] = [];
    let rowIdx = -1;
    for (const cell of cells) {
      if (await cell.elementHasClass('euiDataGridRowCell--firstColumn')) {
        // first column contains expand icon
        rowIdx++;
        rows[rowIdx] = [];
      }
      if (!(await cell.elementHasClass('euiDataGridRowCell--controlColumn'))) {
        rows[rowIdx].push(await cell.getVisibleText());
      }
    }
    return rows;
  }

  public async getTable(selector: string = 'docTable') {
    return await this.testSubjects.find(selector);
  }

  public async getBodyRows(options?: SelectOptions): Promise<WebElementWrapper[][]> {
    return this.getDocTableRows(options);
  }

  public async getRowsText(renderMoreRows?: boolean) {
    // open full screen mode
    if (renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }

    const table = await this.getTable('docTable');
    const rows = await table.findAllByCssSelector('.euiDataGridRow');

    const rowsText = [];
    for (const row of rows) {
      rowsText.push((await row.getVisibleText()).replace(/[\r\n]/gm, ''));
    }

    // close full screen mode
    if (renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }
    return rowsText;
  }

  /**
   * Returns an array of rows (which are array of cells)
   */
  public async getDocTableRows(options?: SelectOptions) {
    // open full screen mode
    if (options?.renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }

    const table = await this.getTable('docTable');

    if (!table) {
      return [];
    }

    const selector = options?.isAnchorRow
      ? '.euiDataGridRowCell.dscDocsGrid__cell--highlight'
      : '.euiDataGridRowCell';
    const cells = await table.findAllByCssSelector(selector);

    const rows: WebElementWrapper[][] = [];
    let rowIdx = -1;
    for (const cell of cells) {
      if (await cell.elementHasClass('euiDataGridRowCell--firstColumn')) {
        rowIdx++;
        rows[rowIdx] = [];
      }
      rows[rowIdx].push(cell);
    }

    // close full screen mode
    if (options?.renderMoreRows) {
      await this.testSubjects.click('dataGridFullScreenButton');
    }
    return rows;
  }

  /**
   * Returns an array of cells for that row
   */
  public async getRow(options: SelectOptions): Promise<WebElementWrapper[]> {
    return (await this.getBodyRows(options))[options.rowIndex || 0];
  }

  public async clickRowToggle(
    options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
  ): Promise<void> {
    const row = await this.getRow(options);
    const testSubj = options.isAnchorRow
      ? '~docTableExpandToggleColumnAnchor'
      : '~docTableExpandToggleColumn';
    const toggle = await row[0].findByTestSubject(testSubj);
    await toggle.click();
  }

  public async getDetailsRows(): Promise<WebElementWrapper[]> {
    return await this.testSubjects.findAll('docTableDetailsFlyout');
  }

  public async closeFlyout() {
    await this.testSubjects.click('euiFlyoutCloseButton');
  }

  public async getHeaderFields(): Promise<string[]> {
    const result = await this.find.allByCssSelector(
      '.euiDataGridHeaderCell__button > .euiDataGridHeaderCell__content'
    );

    const textArr = [];
    for (const cell of result) {
      const textContent = await cell.getAttribute('textContent');
      textArr.push(textContent.trim());
    }
    return Promise.resolve(textArr);
  }

  public async getRowActions(
    options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
  ): Promise<WebElementWrapper[]> {
    const detailsRow = (await this.getDetailsRows())[options.rowIndex || 0];
    return await detailsRow.findAllByTestSubject('~docTableRowAction');
  }

  public async getAnchorDetailsRow(): Promise<WebElementWrapper> {
    const table = await this.getTable();

    return await table.findByCssSelector(
      '[data-test-subj~="docTableAnchorRow"] + [data-test-subj~="docTableDetailsRow"]'
    );
  }

  public async openColMenuByField(field: string) {
    await this.retry.waitFor('header cell action being displayed', async () => {
      // to prevent flakiness
      await this.testSubjects.click(`dataGridHeaderCell-${field}`);
      return await this.testSubjects.exists(`dataGridHeaderCellActionGroup-${field}`);
    });
  }

  private async clickColumnMenuField(field?: string) {
    if (field) {
      await this.openColMenuByField(field);
    } else {
      await this.find.clickByCssSelector('.euiDataGridHeaderCell__button');
    }
  }

  public async clickDocSortAsc(field?: string, sortText = 'Sort Old-New') {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText(sortText);
  }

  public async clickDocSortDesc(field?: string, sortText = 'Sort New-Old') {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText(sortText);
  }

  public async clickMoveColumnRight(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Move right');
  }

  public async clickMoveColumnLeft(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Move left');
  }

  public async clickRemoveColumn(field?: string) {
    await this.clickColumnMenuField(field);
    await this.find.clickByButtonText('Remove column');
  }

  public async clickCopyColumnValues(field: string) {
    await this.openColMenuByField(field);
    await this.find.clickByButtonText('Copy column');
  }

  public async clickCopyColumnName(field: string) {
    await this.openColMenuByField(field);
    await this.find.clickByButtonText('Copy name');
  }

  public async getDetailsRow(): Promise<WebElementWrapper> {
    const detailRows = await this.getDetailsRows();
    return detailRows[0];
  }
  public async addInclusiveFilter(detailsRow: WebElementWrapper, fieldName: string): Promise<void> {
    const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
    const addInclusiveFilterButton = await this.getAddInclusiveFilterButton(tableDocViewRow);
    await addInclusiveFilterButton.click();
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async getAddInclusiveFilterButton(
    tableDocViewRow: WebElementWrapper
  ): Promise<WebElementWrapper> {
    return await tableDocViewRow.findByTestSubject(`~addInclusiveFilterButton`);
  }

  public async getTableDocViewRow(
    detailsRow: WebElementWrapper,
    fieldName: string
  ): Promise<WebElementWrapper> {
    return await detailsRow.findByTestSubject(`~tableDocViewRow-${fieldName}`);
  }

  public async getRemoveInclusiveFilterButton(
    tableDocViewRow: WebElementWrapper
  ): Promise<WebElementWrapper> {
    return await tableDocViewRow.findByTestSubject(`~removeInclusiveFilterButton`);
  }

  public async clickFieldActionInFlyout(fieldName: string, actionName: string): Promise<void> {
    const openPopoverButtonSelector = `openFieldActionsButton-${fieldName}`;
    const inlineButtonsGroupSelector = `fieldActionsGroup-${fieldName}`;
    if (await this.testSubjects.exists(openPopoverButtonSelector)) {
      await this.testSubjects.click(openPopoverButtonSelector);
    } else {
      await this.testSubjects.existOrFail(inlineButtonsGroupSelector);
    }
    await this.testSubjects.click(`${actionName}-${fieldName}`);
  }

  public async removeInclusiveFilter(
    detailsRow: WebElementWrapper,
    fieldName: string
  ): Promise<void> {
    const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
    const addInclusiveFilterButton = await this.getRemoveInclusiveFilterButton(tableDocViewRow);
    await addInclusiveFilterButton.click();
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async hasNoResults() {
    return await this.find.existsByCssSelector('.euiDataGrid__noResults');
  }

  public async checkCurrentRowsPerPageToBe(value: number) {
    await this.retry.try(async () => {
      return (
        (await this.testSubjects.getVisibleText('tablePaginationPopoverButton')) ===
        `Rows per page: ${value}`
      );
    });
  }

  public async changeRowsPerPageTo(newValue: number) {
    await this.testSubjects.click('tablePaginationPopoverButton');
    const option = `tablePagination-${newValue}-rows`;
    await this.retry.try(async () => {
      return this.testSubjects.exists(option);
    });
    await this.testSubjects.click(option);
    await this.checkCurrentRowsPerPageToBe(newValue);
  }
}
