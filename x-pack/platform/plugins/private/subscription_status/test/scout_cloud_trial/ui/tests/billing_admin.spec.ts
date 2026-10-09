/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe(
  'Subscription status badge for billing admins',
  { tag: tags.serverless.search },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      /**
       * HACK: fakes the Cloud billing admin role by rewriting the current user response in the browser.
       *
       * There is no supported way to grant this role in a Scout test. Cloud assigns it at the
       * organization level, and with UIAM a Scout user only carries the single project role it
       * logged in with, so role mappings (used by the stateful cloud_links tests) don't apply.
       * Replace this with a real role once Scout can log in with extra Cloud roles.
       */
      await page.route('**/internal/security/me', async (route) => {
        const response = await route.fetch();
        const user: { roles: string[] } = await response.json();
        await route.fulfill({
          response,
          json: { ...user, roles: [...user.roles, '_ec_billing_admin'] },
        });
      });
      await browserAuth.loginAsViewer();
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
