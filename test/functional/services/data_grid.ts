/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';

interface TabbedGridData {
  columns: string[];
  rows: string[][];
}
interface SelectOptions {
  isAnchorRow?: boolean;
  rowIndex: number;
}

export function DataGridProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  class DataGrid {
    async getDataGridTableData(): Promise<TabbedGridData> {
      const table = await find.byCssSelector('.euiDataGrid');
      const $ = await table.parseDomContent();

      const columns = $('.euiDataGridHeaderCell__content')
        .toArray()
        .map((cell) => $(cell).text());
      const rows = $.findTestSubjects('dataGridRow')
        .toArray()
        .map((row) =>
          $(row)
            .find('.euiDataGridRowCell__truncate')
            .toArray()
            .map((cell) => $(cell).text())
        );

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
      return $('[data-test-subj="dataGridRow"]')
        .toArray()
        .map((row) =>
          $(row)
            .findTestSubjects('dataGridRowCell')
            .toArray()
            .map((cell) =>
              $(cell)
                .findTestSubject(cellDataTestSubj)
                .text()
                .replace(/&nbsp;/g, '')
                .trim()
            )
        );
    }

    /**
     * Returns an array of data grid headers names
     */
    public async getHeaders() {
      const header = await testSubjects.find('dataGridWrapper > dataGridHeader');
      const $ = await header.parseDomContent();
      return $('.euiDataGridHeaderCell__content')
        .toArray()
        .map((cell) => $(cell).text());
    }

    /**
     * Returns a grid cell element by row & column indexes.
     * The row offset equals 1 since the first row of data grid is the header row.
     * @param rowIndex data row index starting from 1 (1 means 1st row)
     * @param columnIndex column index starting from 1 (1 means 1st column)
     */
    public async getCellElement(rowIndex: number, columnIndex: number) {
      return await find.byCssSelector(
        `[data-test-subj="dataGridWrapper"] [data-test-subj="dataGridRow"]:nth-of-type(${
          rowIndex + 1
        })
        [data-test-subj="dataGridRowCell"]:nth-of-type(${columnIndex})`
      );
    }
    public async getFields() {
      const rows = await find.allByCssSelector('.euiDataGridRow');

      const result = [];
      for (const row of rows) {
        const cells = await row.findAllByClassName('euiDataGridRowCell__truncate');
        const cellsText = [];
        let cellIdx = 0;
        for (const cell of cells) {
          if (cellIdx > 0) {
            cellsText.push(await cell.getVisibleText());
          }
          cellIdx++;
        }
        result.push(cellsText);
      }
      return result;
    }

    public async getTable(selector: string = 'docTable') {
      return await testSubjects.find(selector);
    }

    public async getBodyRows(): Promise<WebElementWrapper[]> {
      const table = await this.getTable();
      return await table.findAllByTestSubject('dataGridRow');
    }

    public async getDocTableRows() {
      const table = await this.getTable();
      return await table.findAllByTestSubject('dataGridRow');
    }

    public async getAnchorRow(): Promise<WebElementWrapper> {
      const table = await this.getTable();
      return await table.findByTestSubject('~docTableAnchorRow');
    }

    public async getRow(options: SelectOptions): Promise<WebElementWrapper> {
      return options.isAnchorRow
        ? await this.getAnchorRow()
        : (await this.getBodyRows())[options.rowIndex];
    }

    public async clickRowToggle(
      options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
    ): Promise<void> {
      const row = await this.getRow(options);
      const toggle = await row.findByTestSubject('~docTableExpandToggleColumn');
      await toggle.click();
    }

    public async getDetailsRows(): Promise<WebElementWrapper[]> {
      return await testSubjects.findAll('docTableDetailsFlyout');
    }

    public async closeFlyout() {
      await testSubjects.click('euiFlyoutCloseButton');
    }

    public async getHeaderFields(): Promise<string[]> {
      const result = await find.allByCssSelector('.euiDataGridHeaderCell__content');
      const textArr = [];
      let idx = 0;
      for (const cell of result) {
        if (idx > 0) {
          textArr.push(await cell.getVisibleText());
        }
        idx++;
      }
      return Promise.resolve(textArr);
    }

    public async getRowActions(
      options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
    ): Promise<WebElementWrapper[]> {
      const detailsRow = (await this.getDetailsRows())[options.rowIndex];
      return await detailsRow.findAllByTestSubject('~docTableRowAction');
    }

    public async clickDocSortAsc() {
      await find.clickByCssSelector('.euiDataGridHeaderCell__button');
      await find.clickByButtonText('Sort New-Old');
    }

    public async clickDocSortDesc() {
      await find.clickByCssSelector('.euiDataGridHeaderCell__button');
      await find.clickByButtonText('Sort Old-New');
    }
    public async getDetailsRow(): Promise<WebElementWrapper> {
      const detailRows = await this.getDetailsRows();
      return detailRows[0];
    }
    public async addInclusiveFilter(
      detailsRow: WebElementWrapper,
      fieldName: string
    ): Promise<void> {
      const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
      const addInclusiveFilterButton = await this.getAddInclusiveFilterButton(tableDocViewRow);
      await addInclusiveFilterButton.click();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
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

    public async removeInclusiveFilter(
      detailsRow: WebElementWrapper,
      fieldName: string
    ): Promise<void> {
      const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
      const addInclusiveFilterButton = await this.getRemoveInclusiveFilterButton(tableDocViewRow);
      await addInclusiveFilterButton.click();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }
  }

  return new DataGrid();
}
