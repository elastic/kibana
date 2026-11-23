/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

type BoostTab = 'rules' | 'profiles';

export class SearchBoostPage {
  readonly dataManagementNavItem: Locator;
  readonly dataManagementPanel: Locator;
  readonly esqlViewsNavItem: Locator;
  readonly searchBoostNavItem: Locator;
  readonly description: Locator;
  readonly rulesTable: Locator;
  readonly profilesTable: Locator;
  readonly searchBox: Locator;

  constructor(private readonly page: ScoutPage) {
    this.dataManagementNavItem = page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Data management' });
    this.dataManagementPanel = page.getByRole('region', {
      name: 'Side panel for Data management',
    });
    this.esqlViewsNavItem = this.dataManagementPanel.getByRole('link', { name: 'ES|QL Views' });
    this.searchBoostNavItem = this.dataManagementPanel.getByRole('link', {
      name: /^Search boost/,
    });
    this.description = page.getByTestId('appHeaderDescription');
    this.rulesTable = page.getByTestId('searchBoostRulesTable');
    this.profilesTable = page.getByTestId('searchBoostProfilesTable');
    this.searchBox = page.getByTestId('contentListToolbar-searchBox');
  }

  async gotoHome() {
    await this.page.gotoApp('home');
    await this.dataManagementNavItem.waitFor();
  }

  async openDataManagementNav() {
    await this.dataManagementNavItem.click();
    await this.dataManagementPanel.waitFor();
  }

  async gotoTab(tab: BoostTab) {
    await this.page.gotoApp(`management/data/search_boost/${tab}`);
    await (tab === 'rules' ? this.rulesTable : this.profilesTable).waitFor();
  }

  /** Lists only what matches, so other rules or profiles on the stack can't push it to another page. */
  async search(text: string) {
    await this.searchBox.fill(text);
  }

  /** The table row of the given rule or profile. */
  row(table: Locator, name: string) {
    // The test names use only letters, `-`, and `_`, so they read the same as a pattern.
    return table.getByRole('row').filter({
      has: this.page
        .getByTestId(/^searchBoost(Rule|Profile)Link$/)
        .filter({ hasText: new RegExp(`^${name}$`) }),
    });
  }
}
