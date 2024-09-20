/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class ESQLService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async getHistoryItems(): Promise<string[][]> {
    const queryHistory = await this.testSubjects.find('ESQLEditor-queryHistory');
    const tableBody = await this.retry.try(async () => queryHistory.findByTagName('tbody'));
    const $ = await tableBody.parseDomContent();
    return $('tr')
      .toArray()
      .map((tr) => {
        return $(tr)
          .find('td')
          .toArray()
          .map((cell) => {
            // if this is an EUI table, filter down to the specific cell content
            // otherwise this will include mobile-specific header information
            const euiTableCellContent = $(cell).find('.euiTableCellContent');

            if (euiTableCellContent.length > 0) {
              return $(cell).find('.euiTableCellContent').text().trim();
            } else {
              return $(cell).text().trim();
            }
          });
      });
  }

  public async getHistoryItem(rowIndex = 0) {
    const queryHistory = await this.testSubjects.find('ESQLEditor-queryHistory');
    const tableBody = await this.retry.try(async () => queryHistory.findByTagName('tbody'));
    const rows = await this.retry.try(async () => tableBody.findAllByTagName('tr'));

    return rows[rowIndex];
  }

  public async clickHistoryItem(rowIndex = 0) {
    const row = await this.getHistoryItem(rowIndex);
    const toggle = await row.findByTestSubject('ESQLEditor-queryHistory-runQuery-button');
    await toggle.click();
  }
}
