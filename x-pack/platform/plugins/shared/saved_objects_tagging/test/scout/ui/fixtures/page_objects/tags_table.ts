/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export interface DisplayedTagInfo {
  name: string;
  description: string;
  // Optional because the connections column is hidden when the user lacks
  // read access to the references.
  connectionCount?: number;
}

export class TagsTable {
  readonly root: Locator;
  readonly searchBar: Locator;
  readonly rows: Locator;
  readonly bulkActionsButton: Locator;
  readonly selectAllCheckbox: Locator;

  constructor(private readonly page: ScoutPage) {
    this.root = page.testSubj.locator('tagsManagementTable');
    this.searchBar = page.testSubj.locator('tagsManagementSearchBar');
    this.rows = page.testSubj.locator('tagsTableRow');
    this.bulkActionsButton = page.testSubj.locator('actionBar-contextMenuButton');
    this.selectAllCheckbox = page.testSubj.locator('checkboxSelectAll');
  }

  async waitForLoaded() {
    await this.page.testSubj.waitForSelector('tagsManagementTable table-is-ready');
  }

  async searchForTerm(term: string) {
    await this.searchBar.fill(term);
    await this.page.keyboard.press('Enter');
    await this.waitForLoaded();
  }

  async getDisplayedTagsInfo(): Promise<DisplayedTagInfo[]> {
    const rows = await this.rows.all();
    return Promise.all(
      rows.map(async (row) => {
        const nameCell = row.locator('[data-test-subj="tagsTableRowTagName"]');
        // Read from the inner `.euiTableCellContent` div to exclude EUI's visually hidden
        // tabular-copy markers (U+21A6 "↦" / U+21B5 "↵" spans appended to the `<td>`) which
        // `innerText()` picks up and which `.trim()` cannot remove (they are not whitespace).
        const descriptionCell = row
          .locator('[data-test-subj="tagsTableRowDescription"]')
          .locator('.euiTableCellContent');
        const connectionsLocator = row.locator('[data-test-subj="tagsTableRowConnectionsLink"]');

        const [rawName, rawDescription, connectionCount] = await Promise.all([
          nameCell.innerText(),
          descriptionCell.innerText(),
          this.parseConnectionCount(connectionsLocator),
        ]);

        return {
          name: rawName.trim(),
          description: rawDescription.trim(),
          connectionCount,
        };
      })
    );
  }

  async getDisplayedTagInfo(tagName: string) {
    const tags = await this.getDisplayedTagsInfo();
    return tags.find((tag) => tag.name === tagName);
  }

  async getDisplayedTagNames() {
    const tags = await this.getDisplayedTagsInfo();
    return tags.map((tag) => tag.name);
  }

  async selectTagByName(tagName: string) {
    const row = this.rowByName(tagName);
    await row.locator('.euiTableRowCellCheckbox .euiCheckbox__input').click();
  }

  async selectAllTags() {
    await this.selectAllCheckbox.click();
  }

  async openBulkActionsMenu() {
    await this.bulkActionsButton.click();
  }

  async runBulkAction(actionId: string) {
    await this.openBulkActionsMenu();
    await this.page.testSubj.click(`actionBar-button-${actionId}`);
  }

  async isBulkActionsButtonVisible() {
    return this.bulkActionsButton.isVisible();
  }

  // portal: action rendered in EUI portal (collapsed menu); inline: rendered on the row.
  async clickRowAction(tagName: string, action: string, location: 'portal' | 'inline' = 'inline') {
    const testSubj = `tagsTableAction-${action}`;
    const actionLocator =
      location === 'portal'
        ? this.page.locator('[data-euiportal="true"]').locator(`[data-test-subj="${testSubj}"]`)
        : this.rowByName(tagName).locator(`[data-test-subj="${testSubj}"]`);

    await actionLocator.waitFor({ state: 'visible' });
    await actionLocator.click();
  }

  async clickCollapsedRowAction(tagName: string, action: string) {
    const row = this.rowByName(tagName);
    const collapseBtn = row.locator('[data-test-subj="euiCollapsedItemActionsButton"]');
    await collapseBtn.waitFor({ state: 'visible' });
    await collapseBtn.click();
    await this.clickRowAction(tagName, action, 'portal');
  }

  rowByName(tagName: string): Locator {
    return this.rows.filter({
      has: this.page
        .locator('[data-test-subj="tagsTableRowName"]')
        .getByText(tagName, { exact: true }),
    });
  }

  async isSelectionColumnVisible() {
    return this.selectAllCheckbox.isVisible();
  }

  async isBulkActionPresent(actionId: string) {
    if (!(await this.isBulkActionsButtonVisible())) {
      return false;
    }
    await this.openBulkActionsMenu();
    const actionButton = this.page.testSubj.locator(`actionBar-button-${actionId}`);
    const isPresent = (await actionButton.count()) > 0;
    await this.page.keyboard.press('Escape');
    return isPresent;
  }

  async isRowActionAvailable(action: string, tagName: string) {
    const row = this.rowByName(tagName);
    const collapsedActionsButton = row.locator('[data-test-subj="euiCollapsedItemActionsButton"]');
    if (await collapsedActionsButton.isVisible()) {
      await collapsedActionsButton.click();
      const actionInPortal = this.page
        .locator('[data-euiportal="true"]')
        .locator(`[data-test-subj="tagsTableAction-${action}"]`);
      const isPresent = (await actionInPortal.count()) > 0;
      await this.page.keyboard.press('Escape');
      return isPresent;
    }

    const inlineAction = row.locator(`[data-test-subj="tagsTableAction-${action}"]`);
    return (await inlineAction.count()) > 0;
  }

  private async parseConnectionCount(connectionsLocator: Locator) {
    if ((await connectionsLocator.count()) === 0) {
      return undefined;
    }
    const text = (await connectionsLocator.innerText()).trim();
    const digits = text.replace(/[^0-9]/g, '');
    return digits ? Number(digits) : undefined;
  }
}
