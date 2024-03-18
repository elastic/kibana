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
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

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
   * Opens inspector viewId for example 'Requests
   * @param viewId
   */

  public async openInspectorView(viewId: string): Promise<void> {
    this.log.debug(`Open Inspector view ${viewId}`);
    const dtsViewId = 'inspectorViewChooser' + viewId;
    await this.retry.try(async () => {
      await this.testSubjects.click('inspectorViewChooser');
      // check whether popover menu opens, if not, fail and retry opening
      await this.testSubjects.existOrFail(dtsViewId, { timeout: 2000 });
      await this.testSubjects.click(dtsViewId);
      const selection = await this.testSubjects.getVisibleText('inspectorViewChooser');
      this.log.debug(`inspector view selection = ${selection}`);
      expect(selection.includes(viewId)).to.be(true);
    });
  }

  /**
   * Opens inspector requests view
   */
  public async openInspectorRequestsView(): Promise<void> {
    if (!(await this.testSubjects.exists('inspectorViewChooser'))) return;
    await this.openInspectorView('Requests');
  }

  /**
   * Check how many tables are being shown in the inspector.
   * @returns
   */
  public async getNumberOfTables(): Promise<number> {
    const chooserDataTestId = 'inspectorTableChooser';
    const menuDataTestId = 'inspectorTableChooserMenuPanel';

    if (!(await this.testSubjects.exists(chooserDataTestId))) {
      return 1;
    }

    return await this.retry.try(async () => {
      await this.testSubjects.click(chooserDataTestId);
      const menu = await this.testSubjects.find(menuDataTestId);
      return (
        await menu.findAllByCssSelector(`[data-test-subj="${menuDataTestId}"] .euiContextMenuItem`)
      ).length;
    });
  }

  public async getTableDataWithId(tableTestSubj: string): Promise<string[][]> {
    const chooserDataTestId = 'inspectorTableChooser';
    if (!(await this.testSubjects.exists(chooserDataTestId))) {
      return [];
    }

    return await this.retry.try(async () => {
      await this.testSubjects.click(chooserDataTestId);
      await this.testSubjects.click(tableTestSubj);
      return this.getTableData();
    });
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
   * Opens request by name. Use when inspector has multiple requests and you want to view a specific request
   */
  public async openRequestByName(requestName: string): Promise<void> {
    await this.openInspectorRequestsView();
    this.log.debug(`Open Inspector request ${requestName}`);
    await this.testSubjects.click('inspectorRequestChooser');
    await this.testSubjects.click(`inspectorRequestChooser${requestName.replace(/\s+/, '_')}`);
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

  public async getRequest(
    codeEditorIndex: number = 0
  ): Promise<{ command: string; body: Record<string, any> }> {
    await (await this.getOpenRequestDetailRequestButton()).click();

    await this.monacoEditor.waitCodeEditorReady('inspectorRequestCodeViewerContainer');
    const requestString = await this.monacoEditor.getCodeEditorValue(codeEditorIndex);
    this.log.debug('Request string from inspector:', requestString);
    const openBraceIndex = requestString.indexOf('{');
    return {
      command: openBraceIndex >= 0 ? requestString.substring(0, openBraceIndex).trim() : '',
      body: openBraceIndex >= 0 ? JSON.parse(requestString.substring(openBraceIndex)) : {},
    };
  }

  public async getResponse(): Promise<Record<string, any>> {
    await (await this.getOpenRequestDetailResponseButton()).click();

    await this.monacoEditor.waitCodeEditorReady('inspectorRequestCodeViewerContainer');
    const responseString = await this.monacoEditor.getCodeEditorValue();
    this.log.debug('Response string from inspector:', responseString);
    return JSON.parse(responseString);
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
