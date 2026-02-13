/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/**
 * Tests for legacy route redirects to ensure old URLs continue to work
 * by properly redirecting to the new management routes.
 *
 * This prevents regression if legacy route handling is accidentally removed.
 */
test.describe(
  'Legacy route redirects',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('redirects /{key}/{tab} to /{key}/management/retention', async ({ page }) => {
      // Navigate to a legacy URL pattern (logs/overview was the old detail view)
      await page.gotoApp('streams/logs/overview');

      // Should redirect to the management retention tab
      await expect(page).toHaveURL(/\/streams\/logs\/management\/retention/);

      // Verify we're on the retention tab by checking for the retention UI
      await expect(page.getByTestId('retentionTab')).toBeVisible();
    });

    test('redirects /{key}/{tab} preserving query params', async ({ page }) => {
      // Navigate with time range query params
      await page.gotoApp('streams/logs/dashboard?rangeFrom=now-1h&rangeTo=now');

      // Should redirect and preserve the query params
      await expect(page).toHaveURL(/\/streams\/logs\/management\/retention\?rangeFrom=now-1h/);
      await expect(page).toHaveURL(/rangeTo=now/);
    });

    test('redirects /{key} root to /{key}/management/retention', async ({ page }) => {
      // Navigate to stream root without a tab
      await page.gotoApp('streams/logs');

      // Should redirect to management retention tab
      await expect(page).toHaveURL(/\/streams\/logs\/management\/retention/);
    });

    test('redirects deep invalid paths via catch-all route', async ({ page }) => {
      // Navigate to an invalid deep path that should be caught by /*
      await page.gotoApp('streams/logs/some/invalid/deep/path');

      // Should redirect to the management retention tab
      await expect(page).toHaveURL(/\/streams\/logs\/management\/retention/);
    });

    // Skip: The discovery page has access guards that may redirect back to the main page
    // when streams feature requirements are not met. This behavior is expected and not
    // the focus of legacy route redirect testing.
    test.skip('redirects /_discovery to /_discovery/streams', async ({ page }) => {
      // Navigate to discovery root
      await page.gotoApp('streams/_discovery');

      // Should redirect to discovery streams tab
      await expect(page).toHaveURL(/\/streams\/_discovery\/streams/);
    });

    test('valid management routes do not redirect', async ({ page, pageObjects }) => {
      // Navigate directly to a valid management route
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Should stay on the same URL (no redirect)
      await expect(page).toHaveURL(/\/streams\/logs\/management\/retention/);

      // Verify the retention tab is active
      await expect(page.getByTestId('retentionTab')).toBeVisible();
    });
  }
);
