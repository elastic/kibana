/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function InspectorProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const renderable = getService('renderable');
  const flyout = getService('flyout');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  class Inspector {
    private async getIsEnabled(): Promise<boolean> {
      const ariaDisabled = await testSubjects.getAttribute('openInspectorButton', 'disabled');
      return ariaDisabled !== 'true';
    }

    /**
     * Asserts that inspector is enabled
     */
    public async expectIsEnabled(): Promise<void> {
      await retry.try(async () => {
        const isEnabled = await this.getIsEnabled();
        expect(isEnabled).to.be(true);
      });
    }

    /**
     * Asserts that inspector is disabled
     */
    public async expectIsNotEnabled(): Promise<void> {
      await retry.try(async () => {
        const isEnabled = await this.getIsEnabled();
        expect(isEnabled).to.be(false);
      });
    }

    /**
     * Opens inspector panel
     */
    public async open(): Promise<void> {
      log.debug('Inspector.open');
      const isOpen = await testSubjects.exists('inspectorPanel');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('openInspectorButton');
          await testSubjects.exists('inspectorPanel');
        });
      }
    }

    /**
     * Closes inspector panel
     */
    public async close(): Promise<void> {
      log.debug('Close Inspector');
      let isOpen = await testSubjects.exists('inspectorPanel');
      if (isOpen) {
        await retry.try(async () => {
          await flyout.close('inspectorPanel');
          isOpen = await testSubjects.exists('inspectorPanel');
          if (isOpen) {
            throw new Error('Failed to close inspector');
          }
        });
      }
    }

    /**
     * Asserts data on inspector panel
     * @param expectedData
     */
    public async expectTableData(expectedData: string[][]): Promise<void> {
      log.debug(`Inspector.expectTableData(${expectedData.join(',')})`);
      const data = await this.getTableData();
      expect(data).to.eql(expectedData);
    }

    /**
     * Sets table page size
     * @param size rows count
     */
    public async setTablePageSize(size: number): Promise<void> {
      const panel = await testSubjects.find('inspectorPanel');
      await find.clickByButtonText('Rows per page: 20', panel);
      // The buttons for setting table page size are in a popover element. This popover
      // element appears as if it's part of the inspectorPanel but it's really attached
      // to the body element by a portal.
      const tableSizesPopover = await find.byCssSelector('.euiPanel .euiContextMenuPanel');
      await find.clickByButtonText(`${size} rows`, tableSizesPopover);
    }

    /**
     * Returns table data in nested array format
     */
    public async getTableData(): Promise<string[][]> {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const inspectorPanel = await testSubjects.find('inspectorPanel');
      const tableBody = await retry.try(async () => inspectorPanel.findByTagName('tbody'));
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

    /**
     * Returns table headers
     */
    public async getTableHeaders(): Promise<string[]> {
      log.debug('Inspector.getTableHeaders');
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const dataTableHeader = await retry.try(async () => {
        const inspectorPanel = await testSubjects.find('inspectorPanel');
        return await inspectorPanel.findByTagName('thead');
      });
      const $ = await dataTableHeader.parseDomContent();
      return $('th span.euiTableCellContent__text')
        .toArray()
        .map((cell) => $(cell).text().trim());
    }

    /**
     * Asserts table headers
     * @param expected expected headers
     */
    public async expectTableHeaders(expected: string[]): Promise<void> {
      await retry.try(async () => {
        const headers = await this.getTableHeaders();
        expect(headers).to.eql(expected);
      });
    }

    /**
     * Filters table for value by clicking specified cell
     * @param column column index
     * @param row row index
     */
    public async filterForTableCell(column: string | number, row: string | number): Promise<void> {
      await retry.try(async () => {
        const table = await testSubjects.find('inspectorTable');
        const cell = await table.findByCssSelector(
          `tbody tr:nth-child(${row}) td:nth-child(${column})`
        );
        await cell.moveMouseTo();
        const filterBtn = await testSubjects.findDescendant('filterForInspectorCellValue', cell);
        await filterBtn.click();
      });
      await renderable.waitForRender();
    }

    /**
     * Filters out table by clicking specified cell
     * @param column column index
     * @param row row index
     */
    public async filterOutTableCell(column: string | number, row: string | number): Promise<void> {
      await retry.try(async () => {
        const table = await testSubjects.find('inspectorTable');
        const cell = await table.findByCssSelector(
          `tbody tr:nth-child(${row}) td:nth-child(${column})`
        );
        await cell.moveMouseTo();
        const filterBtn = await testSubjects.findDescendant('filterOutInspectorCellValue', cell);
        await filterBtn.click();
      });
      await renderable.waitForRender();
    }

    /**
     * Opens inspector view
     * @param viewId
     */
    public async openInspectorView(viewId: string): Promise<void> {
      log.debug(`Open Inspector view ${viewId}`);
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click(viewId);
    }

    /**
     * Opens inspector requests view
     */
    public async openInspectorRequestsView(): Promise<void> {
      await this.openInspectorView('inspectorViewChooserRequests');
    }

    /**
     * Returns request name as the comma-separated string
     */
    public async getRequestNames(): Promise<string> {
      await this.openInspectorRequestsView();
      const requestChooserExists = await testSubjects.exists('inspectorRequestChooser');
      if (requestChooserExists) {
        await testSubjects.click('inspectorRequestChooser');
        const menu = await testSubjects.find('inspectorRequestChooserMenuPanel');
        const requestNames = await menu.getVisibleText();
        return requestNames.trim().split('\n').join(',');
      }

      const singleRequest = await testSubjects.find('inspectorRequestName');
      return await singleRequest.getVisibleText();
    }

    public getOpenRequestStatisticButton() {
      return testSubjects.find('inspectorRequestDetailStatistics');
    }

    public getOpenRequestDetailRequestButton() {
      return testSubjects.find('inspectorRequestDetailRequest');
    }

    public getOpenRequestDetailResponseButton() {
      return testSubjects.find('inspectorRequestDetailResponse');
    }

    public async getCodeEditorValue() {
      let request: string = '';

      await retry.try(async () => {
        request = await browser.execute(
          () => (window as any).monaco.editor.getModels()[0].getValue() as string
        );
      });

      return request;
    }
  }

  return new Inspector();
}
