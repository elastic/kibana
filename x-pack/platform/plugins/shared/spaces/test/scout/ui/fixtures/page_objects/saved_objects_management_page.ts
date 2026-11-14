/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const spacePrefix = (spaceId?: string) => (spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '');

/**
 * Minimal Saved Objects Management listing page object — just enough to open
 * the "Copy to space" flyout for a given object. The full SOM page object lives
 * in the `saved_objects_management` plugin and is not importable cross-plugin,
 * so this is a plugin-local slice for the spaces copy-to-space migration.
 */
export class SavedObjectsManagementPage {
  public readonly table: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.table = this.page.testSubj.locator('savedObjectsTable');
  }

  async gotoListing(spaceId?: string): Promise<void> {
    await this.page.goto(this.kbnUrl.get(`${spacePrefix(spaceId)}/app/management/kibana/objects`));
    await this.table.waitFor({ state: 'visible' });
  }

  async searchFor(query: string): Promise<void> {
    const searchBar = this.page.testSubj.locator('savedObjectSearchBar');
    await searchBar.fill('');
    await searchBar.fill(query);
    await searchBar.press('Enter');
    await this.table.waitFor({ state: 'visible' });
    await expect(this.page.testSubj.locator('savedObjectsTableRowTitle')).not.toHaveCount(0);
  }

  async clickCopyToSpaceByTitle(title: string): Promise<void> {
    const menu = await this.openRowContextMenu(title);
    await menu
      .locator('[data-test-subj="savedObjectsTableAction-copy_saved_objects_to_space"]')
      .click();
  }

  private async openRowContextMenu(title: string): Promise<Locator> {
    const titleLocator = this.page.testSubj
      .locator('savedObjectsTableRowTitle')
      .filter({ hasText: title });
    const row = this.page
      .locator('[data-test-subj~="savedObjectsTableRow"]')
      .filter({ has: titleLocator });
    await row.waitFor({ state: 'visible' });
    await row.locator('[data-test-subj="euiCollapsedItemActionsButton"]').click();
    const menuPanel = this.page.locator('.euiContextMenuPanel');
    await menuPanel.waitFor({ state: 'visible' });
    return menuPanel;
  }
}
