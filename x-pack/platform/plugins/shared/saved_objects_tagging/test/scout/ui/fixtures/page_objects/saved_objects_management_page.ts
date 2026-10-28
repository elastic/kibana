/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Minimal Saved Objects Management listing page object — enough to drive
 * the tag-filtering flows exercised by the tagging plugin. The full SOM page
 * object lives in the `saved_objects_management` plugin and is not importable
 * cross-plugin.
 */
export class SavedObjectsManagementPage {
  readonly rows: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.rows = this.page.testSubj.locator('~savedObjectsTableRow');
    this.searchInput = this.page.locator(
      '[data-test-subj="savedObjectSearchBar"] input, input[data-test-subj="savedObjectSearchBar"]'
    );
  }

  async goto() {
    await this.page.gotoApp('management/kibana/objects');
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.page.testSubj.waitForSelector('savedObjectSearchBar');
    await this.searchInput.waitFor({ state: 'visible' });
    await this.page.testSubj.waitForSelector('savedObjectsTableRowTitle');
  }

  getTitleLink(title: string): Locator {
    return this.page.testSubj
      .locator('savedObjectsTableRowTitle')
      .getByRole('link', { name: title, exact: true });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async selectFilterTags(...tagNames: string[]) {
    // EUI renders this filter button with aria-label "Tags Selection" (no dedicated test-subj).
    // Regex matches the visible "Tags" text regardless of the i18n hint appended to aria-label.
    await this.page.getByRole('button', { name: /Tags/i }).click();
    for (const tagName of tagNames) {
      await this.page.testSubj.click(`tag-searchbar-option-${tagName.replace(' ', '_')}`);
    }
    await this.page.testSubj.click('savedObjectSearchBar');
  }

  getTagBadges(title: string): Locator {
    const row = this.rows.filter({
      has: this.page.testSubj.locator('savedObjectsTableRowTitle').getByText(title),
    });
    return row.locator('[data-test-subj="listingTableRowTags"] [data-test-subj^="tag-badge-"]');
  }
}
