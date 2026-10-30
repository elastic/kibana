/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

// The local stateful test cluster runs a trial license. Cloud deployments get the Cloud badge
// instead, so this suite only runs locally.
test.describe(
  'Subscription status badge on a self-managed trial',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.home.goto();
    });

    test('shows the days left and links to the feature comparison', async ({ page }) => {
      const badge = page.testSubj.locator('subscriptionStatusBadge');
      await expect(badge).toContainText('Trial');

      await badge.click();
      await expect(page.testSubj.locator('subscriptionStatusMeter')).toContainText(
        /\d+ days? left/
      );
      const compareFeatures = page.testSubj.locator('subscriptionStatusSecondaryAction');
      await expect(compareFeatures).toHaveText('Compare license features');
      await expect(compareFeatures).toHaveAttribute('href', 'https://www.elastic.co/subscriptions');
      await expect(compareFeatures).toHaveAttribute('target', '_blank');
    });
  }
);
