/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SubscriptionStatusPage {
  public readonly badge: Locator;
  public readonly popover: Locator;
  public readonly subscribeButton: Locator;
  public readonly viewPricingLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.badge = this.page.testSubj.locator('subscriptionStatusBadge');
    this.popover = this.page.testSubj.locator('subscriptionStatusPopover');
    this.subscribeButton = this.page.testSubj.locator('subscriptionStatusPrimaryAction');
    this.viewPricingLink = this.page.testSubj.locator('subscriptionStatusSecondaryAction');
  }

  async openPopover() {
    await this.badge.click();
    await this.subscribeButton.waitFor({ state: 'visible' });
  }
}
