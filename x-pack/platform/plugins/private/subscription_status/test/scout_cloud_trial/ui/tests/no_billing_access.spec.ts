/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe(
  'Subscription status badge for users without billing access',
  { tag: tags.serverless.search },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      await page.gotoApp('management');
    });

    test('shows a tooltip asking to contact the administrator', async ({ page }) => {
      const badge = page.testSubj.locator('subscriptionStatusBadge');

      await expect(badge).toContainText('Trial');
      await badge.focus();
      await expect(page.testSubj.locator('subscriptionStatusTooltip')).toHaveText(
        'Contact your administrator to update the subscription'
      );
      await expect(page.testSubj.locator('subscriptionStatusPrimaryAction')).toBeHidden();
    });
  }
);
