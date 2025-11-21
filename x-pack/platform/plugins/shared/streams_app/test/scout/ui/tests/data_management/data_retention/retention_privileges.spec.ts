/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import {
  openRetentionModal,
  setCustomRetention,
  toggleInheritSwitch,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - privileges', { tag: ['@ess', '@svlOblt'] }, () => {
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

  test.afterEach(async ({ apiServices, pageObjects }) => {
    await pageObjects.toasts.closeAll();
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('should show edit button with lifecycle privileges', async ({ page }) => {
    // With admin user, edit button should be visible
    await expect(page.getByTestId(RETENTION_TEST_IDS.editButton)).toBeVisible();
  });

  test('should allow editing retention with lifecycle privileges', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    // Save button should be enabled
    await expect(page.getByTestId(RETENTION_TEST_IDS.saveButton)).toBeEnabled();
  });

  test('should allow saving retention with lifecycle privileges', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await page.getByTestId(RETENTION_TEST_IDS.saveButton).click();
    await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('7 days');
  });

  // Note: Additional privilege tests require:
  // 1. Creating users with different privilege levels
  // 2. Logging in as those users
  // 3. Verifying UI elements are disabled/hidden without lifecycle privilege
  // 4. Testing read-only mode behavior
  //
  // These tests are placeholders and would need proper user setup
});
