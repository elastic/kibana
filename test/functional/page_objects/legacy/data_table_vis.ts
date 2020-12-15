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

import { FtrProviderContext } from 'test/functional/ftr_provider_context';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';

export function LegacyDataTableVisProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  class LegacyDataTableVis {
    /**
     * Converts the table data into nested array
     * [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
     * @param element table
     */
    private async getDataFromElement(element: WebElementWrapper): Promise<string[][]> {
      const $ = await element.parseDomContent();
      return $('tr')
        .toArray()
        .map((row) =>
          $(row)
            .find('td')
            .toArray()
            .map((cell) =>
              $(cell)
                .text()
                .replace(/&nbsp;/g, '')
                .trim()
            )
        );
    }

    public async getTableVisContent({ stripEmptyRows = true } = {}) {
      return await retry.try(async () => {
        const container = await testSubjects.find('tableVis');
        const allTables = await testSubjects.findAllDescendant('paginated-table-body', container);

        if (allTables.length === 0) {
          return [];
        }

        const allData = await Promise.all(
          allTables.map(async (t) => {
            let data = await this.getDataFromElement(t);
            if (stripEmptyRows) {
              data = data.filter(
                (row) => row.length > 0 && row.some((cell) => cell.trim().length > 0)
              );
            }
            return data;
          })
        );

        if (allTables.length === 1) {
          // If there was only one table we return only the data for that table
          // This prevents an unnecessary array around that single table, which
          // is the case we have in most tests.
          return allData[0];
        }

        return allData;
      });
    }

    public async filterOnTableCell(column: number, row: number) {
      await retry.try(async () => {
        const tableVis = await testSubjects.find('tableVis');
        const cell = await tableVis.findByCssSelector(
          `tbody tr:nth-child(${row}) td:nth-child(${column})`
        );
        await cell.moveMouseTo();
        const filterBtn = await testSubjects.findDescendant('filterForCellValue', cell);
        await filterBtn.click();
      });
    }
  }

  return new LegacyDataTableVis();
}
