/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class InspectorService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly renderable = this.ctx.getService('renderable');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly comboBox = this.ctx.getService('comboBox');

  private async getIsEnabled(): Promise<boolean> {
    const ariaDisabled = await this.testSubjects.getAttribute('openInspectorButton', 'disabled');
    return ariaDisabled !== 'true';
  }

  /**
   * Asserts that inspector is enabled
   */
  public async expectIsEnabled(): Promise<void> {
    await this.retry.try(async () => {
      const isEnabled = await this.getIsEnabled();
      expect(isEnabled).to.be(true);
    });
  }

  /**
   * Asserts that inspector is disabled
   */
  public async expectIsNotEnabled(): Promise<void> {
    await this.retry.try(async () => {
      const isEnabled = await this.getIsEnabled();
      expect(isEnabled).to.be(false);
    });
  }

  /**
   * Opens inspector panel
   */
  public async open(openButton: string = 'openInspectorButton'): Promise<void> {
    this.log.debug('Inspector.open');
    const isOpen = await this.testSubjects.exists('inspectorPanel');
    if (!isOpen) {
      await this.retry.try(async () => {
        await this.testSubjects.click(openButton);
        await this.testSubjects.exists('inspectorPanel');
      });
    }
  }

  /**
   * Closes inspector panel
   */
  public async close(): Promise<void> {
    this.log.debug('Close Inspector');
    let isOpen = await this.testSubjects.exists('inspectorPanel');
    if (isOpen) {
      await this.retry.try(async () => {
        await this.flyout.close('inspectorPanel');
        isOpen = await this.testSubjects.exists('inspectorPanel');
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
    this.log.debug(`Inspector.expectTableData(${expectedData.join(',')})`);
    const data = await this.getTableData();
    expect(data).to.eql(expectedData);
  }

  /**
   * Sets table page size
   * @param size rows count
   */
  public async setTablePageSize(size: number): Promise<void> {
    const panel = await this.testSubjects.find('inspectorPanel');
    await this.find.clickByButtonText('Rows per page: 20', panel);
    // The buttons for setting table page size are in a popover element. This popover
    // element appears as if it's part of the inspectorPanel but it's really attached
    // to the body element by a portal.
    const tableSizesPopover = await this.find.byCssSelector('.euiPanel .euiContextMenuPanel');
    await this.find.clickByButtonText(`${size} rows`, tableSizesPopover);
  }

  /**
   * Returns table data in nested array format
   */
  public async getTableData(): Promise<string[][]> {
    // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
    const inspectorPanel = await this.testSubjects.find('inspectorPanel');
    const tableBody = await this.retry.try(async () => inspectorPanel.findByTagName('tbody'));
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
    this.log.debug('Inspector.getTableHeaders');
    // TODO: we should use datat-test-subj=inspectorTable as soon as EUI supports it
    const dataTableHeader = await this.retry.try(async () => {
      const inspectorPanel = await this.testSubjects.find('inspectorPanel');
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
    await this.retry.try(async () => {
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
    await this.retry.try(async () => {
      const table = await this.testSubjects.find('inspectorTable');
      const cell = await table.findByCssSelector(
        `tbody tr:nth-child(${row}) td:nth-child(${column})`
      );
      await cell.moveMouseTo();
      const filterBtn = await this.testSubjects.findDescendant('filterForInspectorCellValue', cell);
      await filterBtn.click();
    });
    await this.renderable.waitForRender();
  }

  /**
   * Filters out table by clicking specified cell
   * @param column column index
   * @param row row index
   */
  public async filterOutTableCell(column: string | number, row: string | number): Promise<void> {
    await this.retry.try(async () => {
      const table = await this.testSubjects.find('inspectorTable');
      const cell = await table.findByCssSelector(
        `tbody tr:nth-child(${row}) td:nth-child(${column})`
      );
      await cell.moveMouseTo();
      const filterBtn = await this.testSubjects.findDescendant('filterOutInspectorCellValue', cell);
      await filterBtn.click();
    });
    await this.renderable.waitForRender();
  }

  /**
   * Opens inspector view
   * @param viewId
   */
  public async openInspectorView(viewId: string): Promise<void> {
    this.log.debug(`Open Inspector view ${viewId}`);
    await this.retry.try(async () => {
      await this.testSubjects.click('inspectorViewChooser');
      // check whether popover menu opens, if not, fail and retry opening
      await this.testSubjects.existOrFail(viewId, { timeout: 2000 });
      await this.testSubjects.click(viewId);
    });
  }

  /**
   * Opens inspector requests view
   */
  public async openInspectorRequestsView(): Promise<void> {
    await this.openInspectorView('inspectorViewChooserRequests');
  }

  /**
   * Returns the selected option value from combobox
   */
  public async getSelectedOption(): Promise<string> {
    await this.openInspectorRequestsView();
    const selectedOption = await this.comboBox.getComboBoxSelectedOptions(
      'inspectorRequestChooser'
    );

    if (selectedOption.length !== 1) {
      return 'Combobox has multiple options';
    }

    return selectedOption[0];
  }

  /**
   * Returns request name as the comma-separated string from combobox
   */
  public async getRequestNames(): Promise<string> {
    await this.openInspectorRequestsView();

    const comboBoxOptions = await this.comboBox.getOptionsList('inspectorRequestChooser');
    return comboBoxOptions.trim().split('\n').join(',');
  }

  public getOpenRequestStatisticButton() {
    return this.testSubjects.find('inspectorRequestDetailStatistics');
  }

  public getOpenRequestDetailRequestButton() {
    return this.testSubjects.find('inspectorRequestDetailRequest');
  }

  public getOpenRequestDetailResponseButton() {
    return this.testSubjects.find('inspectorRequestDetailResponse');
  }

  /**
   * Returns true if the value equals the combobox options list
   * @param value default combobox single option text
   */
  public async hasSingleRequest(
    value: string = "You've selected all available options"
  ): Promise<boolean> {
    await this.openInspectorRequestsView();
    const comboBoxOptions = await this.comboBox.getOptionsList('inspectorRequestChooser');

    return value === comboBoxOptions;
  }
}
