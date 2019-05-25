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

import expect from '@kbn/expect';

export function InspectorProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const renderable = getService('renderable');
  const flyout = getService('flyout');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return new class Inspector {
    async getIsEnabled() {
      const button = await testSubjects.find('openInspectorButton');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      return ariaDisabled !== 'true';
    }

    async expectIsEnabled() {
      await retry.try(async () => {
        const isEnabled = await this.getIsEnabled();
        expect(isEnabled).to.be(true);
      });
    }

    async expectIsNotEnabled() {
      await retry.try(async () => {
        const isEnabled = await this.getIsEnabled();
        expect(isEnabled).to.be(false);
      });
    }

    async open() {
      log.debug('Inspector.open');
      const isOpen = await testSubjects.exists('inspectorPanel');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('openInspectorButton');
          await testSubjects.find('inspectorPanel');
        });
      }
    }

    async close() {
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

    async expectTableData(expectedData) {
      await log.debug(`Inspector.expectTableData(${expectedData.join(',')})`);
      const data = await this.getTableData();
      expect(data).to.eql(expectedData);
    }

    async setTablePageSize(size) {
      const panel = await testSubjects.find('inspectorPanel');
      await find.clickByButtonText('Rows per page: 20', panel);
      // The buttons for setting table page size are in a popover element. This popover
      // element appears as if it's part of the inspectorPanel but it's really attached
      // to the body element by a portal.
      const tableSizesPopover = await find.byCssSelector('.euiPanel');
      await find.clickByButtonText(`${size} rows`, tableSizesPopover);
    }

    async getTableData() {
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const inspectorPanel = await testSubjects.find('inspectorPanel');
      const tableBody = await retry.try(async () => inspectorPanel.findByTagName('tbody'));
      const $ = await tableBody.parseDomContent();
      return $('tr').toArray().map(tr => {
        return $(tr).find('td').toArray().map(cell => {
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

    async getTableHeaders() {
      log.debug('Inspector.getTableHeaders');
      // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
      const dataTableHeader = await retry.try(async () => {
        const inspectorPanel = await testSubjects.find('inspectorPanel');
        return await inspectorPanel.findByTagName('thead');
      });
      const $ = await dataTableHeader.parseDomContent();
      return $('th span.euiTableCellContent__text').toArray()
        .map(cell => $(cell).text().trim());
    }

    async expectTableHeaders(expected) {
      await retry.try(async () => {
        const headers = await this.getTableHeaders();
        expect(headers).to.eql(expected);
      });
    }

    async filterForTableCell(column, row) {
      await retry.try(async () => {
        const table = await testSubjects.find('inspectorTable');
        const cell = await table.findByCssSelector(`tbody tr:nth-child(${row}) td:nth-child(${column})`);
        await browser.moveMouseTo(cell);
        const filterBtn = await testSubjects.findDescendant('filterForInspectorCellValue', cell);
        await filterBtn.click();
      });
      await renderable.waitForRender();
    }

    async filterOutTableCell(column, row) {
      await retry.try(async () => {
        const table = await testSubjects.find('inspectorTable');
        const cell = await table.findByCssSelector(`tbody tr:nth-child(${row}) td:nth-child(${column})`);
        await browser.moveMouseTo(cell);
        const filterBtn = await testSubjects.findDescendant('filterOutInspectorCellValue', cell);
        await filterBtn.click();
      });
      await renderable.waitForRender();
    }

    async openInspectorView(viewId) {
      log.debug(`Open Inspector view ${viewId}`);
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click(viewId);
    }

    async openInspectorRequestsView() {
      await this.openInspectorView('inspectorViewChooserRequests');
    }

    async getRequestNames() {
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
  };
}
