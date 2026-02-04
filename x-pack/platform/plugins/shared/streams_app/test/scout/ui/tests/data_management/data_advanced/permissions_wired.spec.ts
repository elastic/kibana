/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

const WIRED_STREAM = 'logs';

test.describe('Advanced tab permissions - Wired streams', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ pageObjects }) => {
    // Navigate to the wired stream's retention tab (a tab that's always visible)
    await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);
  });

  test('should NOT show Advanced tab for viewer role', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.reload();

    // Verify the Advanced tab is not visible for viewer
    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
  });

  test('should NOT show Advanced tab for editor role', async ({ browserAuth, page }) => {
    await browserAuth.loginAs('editor');
    await page.reload();

    // Verify the Advanced tab is not visible for editor
    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
  });

  test('should show Advanced tab for admin role', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.reload();

    // Verify the Advanced tab is visible for admin
    await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();
  });
});
