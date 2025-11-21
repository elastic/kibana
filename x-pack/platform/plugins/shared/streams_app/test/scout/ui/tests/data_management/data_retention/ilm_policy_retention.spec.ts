/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../../fixtures';
import {
  openRetentionModal,
  toggleInheritSwitch,
  verifyRetentionBadge,
  BADGE_TEXT,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - ILM policy', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamChildren('logs');
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  });

  test.afterEach(async ({ apiServices, page }) => {
    // Only close toasts if they exist
    const toasts = page.locator('.euiToast');
    if ((await toasts.count()) > 0) {
      await page
        .locator('.euiToast__closeButton')
        .click({ timeout: 1000 })
        .catch(() => {});
    }
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('should show ILM policy button', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'ILM policy' }).isVisible();
  });

  test('should display ILM badge when policy is selected', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    // Note: This test requires actual ILM policies to be available
    // The exact test implementation depends on having test ILM policies set up
    await verifyRetentionBadge(page, BADGE_TEXT.ilmPolicy);
  });

  // Note: Additional ILM tests require:
  // 1. Test ILM policies to be created in beforeAll
  // 2. ILM policy selection dropdown to be populated
  // 3. Ability to select and save ILM policies
  // 4. Verification of ILM policy links to management
  //
  // These tests are marked @ess only as ILM is not available in serverless
});
