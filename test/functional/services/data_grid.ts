/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';

interface TabbedGridData {
  columns: string[];
  rows: string[][];
}

export function DataGridProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

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
  }

  return new DataGrid();
}
