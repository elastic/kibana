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
interface SelectOptions {
  isAnchorRow?: boolean;
  rowIndex: number;
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
      return [await testSubjects.find('docTableDetailsFlyout')];
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
      await find.clickByButtonText('Sort ASC');
    }

    public async clickDocSortDesc() {
      await find.clickByCssSelector('.euiDataGridHeaderCell__button');
      await find.clickByButtonText('Sort Desc');
    }
  }

  return new DataGrid();
}
