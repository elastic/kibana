/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
