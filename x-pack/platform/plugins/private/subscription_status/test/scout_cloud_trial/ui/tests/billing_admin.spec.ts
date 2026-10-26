/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// Admins are treated as billing admins until Kibana can check billing access:
// https://github.com/elastic/kibana-team/issues/4343
test.describe(
  'Subscription status badge for billing admins',
  { tag: ['@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.gotoApp('management');
    });

    test('shows the trial popover with subscribe and pricing links', async ({ page }) => {
      const badge = page.testSubj.locator('subscriptionStatusBadge');
      const popover = page.testSubj.locator('subscriptionStatusPopover');
      const subscribeButton = page.testSubj.locator('subscriptionStatusPrimaryAction');
      const viewPricingLink = page.testSubj.locator('subscriptionStatusSecondaryAction');

      await test.step('badge shows in the project header', async () => {
        await expect(badge).toHaveText('Trial');
      });

      await test.step('popover shows the project and region', async () => {
        await badge.click();
        await expect(popover).toContainText('Elasticsearch Serverless');
        await expect(popover).toContainText('AWS (us-east-1)');
        await expect(popover).toContainText("You're on an Elastic Cloud trial.");
      });

      await test.step('links point to Cloud billing and pricing', async () => {
        await expect(subscribeButton).toHaveAttribute('href', /\/billing\/overview\/$/);
        await expect(viewPricingLink).toHaveAttribute('href', /\/cloud-pricing-table\?/);
      });
    });
  }
);
