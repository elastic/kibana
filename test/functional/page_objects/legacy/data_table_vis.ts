/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../../ftr_provider_context';

export class LegacyDataTableVisPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');

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
    return await this.retry.try(async () => {
      const container = await this.testSubjects.find('tableVis');
      const allTables = await this.testSubjects.findAllDescendant(
        'paginated-table-body',
        container
      );

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

  public async filterOnTableCell(columnIndex: number, rowIndex: number) {
    await this.retry.try(async () => {
      const tableVis = await this.testSubjects.find('tableVis');
      const cell = await tableVis.findByCssSelector(
        `tbody tr:nth-child(${rowIndex}) td:nth-child(${columnIndex})`
      );
      await cell.moveMouseTo();
      const filterBtn = await this.testSubjects.findDescendant('filterForCellValue', cell);
      await filterBtn.click();
    });
  }
}
