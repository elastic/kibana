/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// Users without the billing admin role get the subscribe popover until Kibana can check billing
// access: https://github.com/elastic/kibana-team/issues/4343
test.describe(
  'Subscription status badge for users without the billing admin role',
  { tag: ['@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      await page.gotoApp('management');
    });

    test('shows the trial popover with the subscribe link', async ({ page }) => {
      const badge = page.testSubj.locator('subscriptionStatusBadge');

      await badge.click();
      await expect(page.testSubj.locator('subscriptionStatusPopover')).toBeVisible();
      await expect(page.testSubj.locator('subscriptionStatusPrimaryAction')).toHaveAttribute(
        'href',
        /\/billing\/overview\/$/
      );
    });
  }
);
