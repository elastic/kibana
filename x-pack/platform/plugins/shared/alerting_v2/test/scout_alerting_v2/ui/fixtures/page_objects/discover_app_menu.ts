/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class DiscoverAppMenu {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Opens the Alerts app-menu popover. Uses the explicit test id from Discover's `get_alerts`
   * (`discoverAlertsButton`), with a fallback to the chrome default `app-menu-item-${id}` when
   * the explicit id is absent (`app-menu-item-alerts`).
   */
  alertsMenuTrigger() {
    return this.page.testSubj
      .locator('discoverAlertsButton')
      .or(this.page.testSubj.locator('app-menu-item-alerts'));
  }

  async openAlertsMenu() {
    const trigger = this.alertsMenuTrigger();

    if (await trigger.isVisible()) {
      await trigger.click();
      return;
    }

    await this.page.testSubj.locator('app-menu-overflow-button').click();
    await trigger.waitFor({ state: 'visible' });
    await trigger.click();
  }

  /** Opens Alerts → "Create ES|QL rule" (v2) and leaves the rule flyout open. */
  async openCreateEsqlRuleV2Flyout() {
    await this.openAlertsMenu();
    await this.getV2RuleButton().click();
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
