/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class IntegrationHomePage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations');
  }

  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('epmList.integrationCards', {
      state: 'visible',
      timeout: 20_000,
    });
  }

  getIntegrationCard(integration: string) {
    return this.page.testSubj.locator(`integration-card:epr:${integration}`);
  }

  async clickIntegrationCard(integration: string) {
    await this.getIntegrationCard(integration).click();
  }

  async searchForIntegration(integration: string) {
    await this.page.testSubj.fill('epmList.searchBar', integration);
    await expect(this.getIntegrationCard(integration)).toBeVisible({ timeout: 20_000 });
  }

  async navigateToDetailPage(pkgkey: string) {
    await this.page.gotoApp(`integrations/detail/${pkgkey}/overview`);
  }

  getAddIntegrationPolicyButton() {
    return this.page.testSubj.locator('addIntegrationPolicyButton');
  }
}
