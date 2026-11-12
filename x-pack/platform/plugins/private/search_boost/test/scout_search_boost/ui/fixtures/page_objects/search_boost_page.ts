/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SearchBoostPage {
  readonly dataManagementNavItem: Locator;
  readonly dataManagementPanel: Locator;
  readonly esqlViewsNavItem: Locator;
  readonly searchBoostNavItem: Locator;
  readonly description: Locator;

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
  }

  async gotoHome() {
    await this.page.gotoApp('home');
    await this.dataManagementNavItem.waitFor();
  }

  async openDataManagementNav() {
    await this.dataManagementNavItem.click();
    await this.dataManagementPanel.waitFor();
  }
}
