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

interface TabbedGridData {
  columns: string[];
  rows: string[][];
}

export function DataGridProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  class DataGrid {
    async getColumnsData() {
      const columns: TabbedGridData['columns'] = [];
      const header = await retry.try(async () => await testSubjects.find('dataGridHeader'));

      for (const column of await header.findAllByClassName('euiDataGridHeaderCell__content')) {
        columns.push(await column.getVisibleText());
      }

      return columns;
    }

    async getRowsData() {
      const rows: TabbedGridData['rows'] = [];
      const rowsElements = await retry.try(async () => await testSubjects.findAll('dataGridRow'));

      for (const rowElement of rowsElements) {
        const rowData = [];
        const dataGridRowCells = await rowElement.findAllByTestSubject('dataGridRowCell');

        for (const cell of dataGridRowCells) {
          rowData.push(await cell.getVisibleText());
        }

        rows.push(rowData);
      }

      return rows;
    }

    async getDataGridTableData(): Promise<TabbedGridData> {
      return {
        columns: await this.getColumnsData(),
        rows: await this.getRowsData(),
      };
    }
  }

  return new DataGrid();
}
