/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Page object for the alerting_v2 entries inside Discover's app-menu.
 *
 * Discover's app-menu places its items either directly on the top bar or inside
 * the overflow popover, depending on the available viewport width. The Alerts
 * trigger keeps the same `data-test-subj` (`discoverAlertsButton`) in both
 * render paths because `core-chrome-app-menu-components/src/utils.tsx`
 * propagates `item.testId` to the popover panel item, mirroring the pattern in
 * Scout's built-in `DiscoverApp.clickAppMenuItem`.
 */
export class DiscoverAppMenu {
  public readonly alertsTrigger: Locator;
  public readonly overflowButton: Locator;
  public readonly overflowPopover: Locator;
  public readonly createEsqlRuleButton: Locator;
  public readonly createEsqlRuleBadge: Locator;
  public readonly createAlertButton: Locator;
  public readonly manageAlertsButton: Locator;
  public readonly rulesTopLevelButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.alertsTrigger = this.page.testSubj.locator('discoverAlertsButton');
    this.overflowButton = this.page.testSubj.locator('app-menu-overflow-button');
    this.overflowPopover = this.page.testSubj.locator('app-menu-popover');
    this.createEsqlRuleButton = this.page.testSubj.locator('discoverCreateEsqlRuleV2Button');
    this.createEsqlRuleBadge = this.page.testSubj.locator('discoverCreateEsqlRuleV2Button-badge');
    this.createAlertButton = this.page.testSubj.locator('discoverCreateAlertButton');
    this.manageAlertsButton = this.page.testSubj.locator('discoverManageAlertsButton');
    this.rulesTopLevelButton = this.page.testSubj.locator('discoverRulesMenuButton');
  }

  /**
   * Opens the Alerts entry in Discover's app-menu.
   *
   * @param isInOverflowMenu Force the overflow path. When omitted, the method
   *   clicks the trigger directly if it's already visible on the top bar and
   *   falls back to opening the overflow popover otherwise.
   */
  async openAlertsMenu({ isInOverflowMenu }: { isInOverflowMenu?: boolean } = {}) {
    if (!isInOverflowMenu && (await this.alertsTrigger.isVisible())) {
      await this.alertsTrigger.click();
      return;
    }

    // Dismiss any stale popovers from a previous interaction so the next click
    // opens the overflow rather than closing it.
    if (await this.overflowPopover.isVisible()) {
      await this.overflowButton.click();
      await this.overflowPopover.waitFor({ state: 'hidden' });
    }

    await this.overflowButton.waitFor({ state: 'visible' });
    await this.overflowButton.click();
    await this.overflowPopover.waitFor({ state: 'visible' });
    await this.alertsTrigger.waitFor({ state: 'visible' });
    await this.alertsTrigger.click();
  }

  /** Opens Alerts → "Create ES|QL rule" and leaves the rule flyout open. */
  async openCreateEsqlRuleFlyout(options: { isInOverflowMenu?: boolean } = {}) {
    await this.openAlertsMenu(options);
    await this.createEsqlRuleButton.click();
  }
}
