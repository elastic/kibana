/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class DiscoverAppMenu {
  constructor(private readonly page: ScoutPage) {}

  async openAlertsMenu() {
    const alertsButton = this.page.testSubj.locator('discoverAlertsButton');

    if (await alertsButton.isVisible()) {
      await alertsButton.click();
      return;
    }

    const overflowButton = this.page.testSubj.locator('app-menu-overflow-button');
    await overflowButton.click();
    await alertsButton.click();
  }

  getV2RuleButton() {
    return this.page.testSubj.locator('discoverCreateEsqlRuleV2Button');
  }

  getV2RuleBadge() {
    return this.page.testSubj.locator('discoverCreateEsqlRuleV2Button-badge');
  }

  getCreateAlertButton() {
    return this.page.testSubj.locator('discoverCreateAlertButton');
  }

  getManageAlertsButton() {
    return this.page.testSubj.locator('discoverManageAlertsButton');
  }

  getRulesTopLevelButton() {
    return this.page.testSubj.locator('discoverRulesMenuButton');
  }
}
