/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockBillingAdminRole, test } from '../fixtures';

test.describe(
  'Subscription status badge for billing admins',
  { tag: tags.serverless.search },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await mockBillingAdminRole(page);
      await browserAuth.loginAsViewer();
      await page.gotoApp('management');
    });

    test('shows the trial popover with subscribe and pricing links', async ({ pageObjects }) => {
      const { subscriptionStatus } = pageObjects;

      await test.step('badge shows in the project header', async () => {
        await expect(subscriptionStatus.badge).toHaveText('Trial');
      });

      await test.step('popover shows the project and region', async () => {
        await subscriptionStatus.openPopover();
        await expect(subscriptionStatus.popover).toContainText('Elasticsearch Serverless');
        await expect(subscriptionStatus.popover).toContainText('AWS (us-east-1)');
        await expect(subscriptionStatus.popover).toContainText("You're on an Elastic trial.");
      });

      await test.step('links point to Cloud billing and pricing', async () => {
        await expect(subscriptionStatus.subscribeButton).toHaveAttribute(
          'href',
          /\/billing\/overview\/$/
        );
        await expect(subscriptionStatus.viewPricingLink).toHaveAttribute(
          'href',
          /\/cloud-pricing-table\?/
        );
      });
    });
  }
);
