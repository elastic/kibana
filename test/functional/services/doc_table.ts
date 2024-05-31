/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

interface SelectOptions {
  isAnchorRow?: boolean;
  rowIndex?: number;
}

export class DocTableService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly header = this.ctx.getPageObject('header');

  public async getTable(selector?: string) {
    return await this.testSubjects.find(selector ? selector : 'docTable');
  }

  public async getRowsText() {
    const table = await this.getTable();
    const $ = await table.parseDomContent();
    return $.findTestSubjects('~docTableRow')
      .toArray()
      .map((row: any) => $(row).text().trim());
  }

  public async getBodyRows(): Promise<WebElementWrapper[]> {
    const table = await this.getTable();
    return await table.findAllByTestSubject('~docTableRow');
  }

  public async getAnchorRow(): Promise<WebElementWrapper> {
    const table = await this.getTable();
    return await table.findByTestSubject('~docTableAnchorRow');
  }

  public async getRow({
    isAnchorRow = false,
    rowIndex = 0,
  }: SelectOptions = {}): Promise<WebElementWrapper> {
    return isAnchorRow ? await this.getAnchorRow() : (await this.getBodyRows())[rowIndex];
  }

  public async getDetailsRow(): Promise<WebElementWrapper> {
    const table = await this.getTable();
    return await table.findByCssSelector('[data-test-subj~="docTableDetailsRow"]');
  }

  public async getAnchorDetailsRow(): Promise<WebElementWrapper> {
    const table = await this.getTable();
    return await table.findByCssSelector(
      '[data-test-subj~="docTableAnchorRow"] + [data-test-subj~="docTableDetailsRow"]'
    );
  }

  public async clickRowToggle(
    options: SelectOptions = { isAnchorRow: false, rowIndex: 0 }
  ): Promise<void> {
    const row = await this.getRow(options);
    const toggle = await row.findByTestSubject('~docTableExpandToggleColumn');
    await toggle.click();
  }

  public async getDetailsRows(): Promise<WebElementWrapper[]> {
    const table = await this.getTable();
    return await table.findAllByCssSelector(
      '[data-test-subj~="docTableRow"] + [data-test-subj~="docTableDetailsRow"]'
    );
  }

  public async getRowActions({ isAnchorRow = false, rowIndex = 0 }: SelectOptions = {}): Promise<
    WebElementWrapper[]
  > {
    const detailsRow = isAnchorRow
      ? await this.getAnchorDetailsRow()
      : (await this.getDetailsRows())[rowIndex];
    return await detailsRow.findAllByTestSubject('~docTableRowAction');
  }

  public async getFields(options: { isAnchorRow: boolean } = { isAnchorRow: false }) {
    const table = await this.getTable();
    const $ = await table.parseDomContent();
    const rowLocator = options.isAnchorRow ? '~docTableAnchorRow' : '~docTableRow';
    const rows = $.findTestSubjects(rowLocator).toArray();
    return rows.map((row: any) =>
      $(row)
        .find('[data-test-subj~="docTableField"]')
        .toArray()
        .map((field: any) => $(field).text())
    );
  }

  public async getHeaderFields(selector?: string): Promise<string[]> {
    const table = await this.getTable(selector);
    const $ = await table.parseDomContent();
    return $.findTestSubjects('~docTableHeaderField')
      .toArray()
      .map((field: any) => $(field).text().trim());
  }

  public async getHeaders(selector?: string): Promise<string[]> {
    return this.getHeaderFields(selector);
  }

  public async getTableDocViewRow(
    detailsRow: WebElementWrapper,
    fieldName: string
  ): Promise<WebElementWrapper> {
    return await detailsRow.findByTestSubject(`~tableDocViewRow-${fieldName}`);
  }

  public async getAddInclusiveFilterButton(
    tableDocViewRow: WebElementWrapper
  ): Promise<WebElementWrapper> {
    return await tableDocViewRow.findByTestSubject(`~addInclusiveFilterButton`);
  }

  public async addInclusiveFilter(detailsRow: WebElementWrapper, fieldName: string): Promise<void> {
    const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
    const addInclusiveFilterButton = await this.getAddInclusiveFilterButton(tableDocViewRow);
    await addInclusiveFilterButton.click();
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async getRemoveInclusiveFilterButton(
    tableDocViewRow: WebElementWrapper
  ): Promise<WebElementWrapper> {
    return await tableDocViewRow.findByTestSubject(`~removeInclusiveFilterButton`);
  }

  public async removeInclusiveFilter(
    detailsRow: WebElementWrapper,
    fieldName: string
  ): Promise<void> {
    const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
    const addInclusiveFilterButton = await this.getRemoveInclusiveFilterButton(tableDocViewRow);
    await addInclusiveFilterButton.click();
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async getAddExistsFilterButton(
    tableDocViewRow: WebElementWrapper
  ): Promise<WebElementWrapper> {
    return await tableDocViewRow.findByTestSubject(`~addExistsFilterButton`);
  }

  public async addExistsFilter(detailsRow: WebElementWrapper, fieldName: string): Promise<void> {
    const tableDocViewRow = await this.getTableDocViewRow(detailsRow, fieldName);
    const addInclusiveFilterButton = await this.getAddExistsFilterButton(tableDocViewRow);
    await addInclusiveFilterButton.click();
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async toggleRowExpanded({
    isAnchorRow = false,
    rowIndex = 0,
  }: SelectOptions = {}): Promise<WebElementWrapper> {
    await this.clickRowToggle({ isAnchorRow, rowIndex });
    await this.header.awaitGlobalLoadingIndicatorHidden();
    return await this.retry.try(async () => {
      const row = isAnchorRow ? await this.getAnchorRow() : (await this.getBodyRows())[rowIndex];
      const detailsRow = await row.findByXpath(
        './following-sibling::*[@data-test-subj="docTableDetailsRow"]'
      );
      return detailsRow.findByTestSubject('~docViewer');
    });
  }
}
