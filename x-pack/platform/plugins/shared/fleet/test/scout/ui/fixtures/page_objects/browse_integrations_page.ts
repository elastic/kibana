/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type ScoutPage } from '@kbn/scout';

export class BrowseIntegrationPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations');
  }

  async searchForIntegration(integrationName: string) {
    const searchInput = this.page.getByTestId('browseIntegrations.searchBar.input');
    await searchInput.fill(integrationName);
  }

  async expectIntegrationCardToBeVisible(integrationName: string) {
    return expect(this.page.getByTestId(`integration-card:epr:${integrationName}`)).toBeVisible();
  }
}
