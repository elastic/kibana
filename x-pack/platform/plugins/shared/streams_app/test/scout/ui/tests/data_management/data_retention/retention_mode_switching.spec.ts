/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../../fixtures';
import {
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  setIndefiniteRetention,
  toggleInheritSwitch,
  verifyRetentionDisplay,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - mode switching', { tag: ['@ess', '@svlOblt'] }, () => {
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

  test('should switch between custom and indefinite modes', async ({ page }) => {
    // Custom to indefinite
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '7 days');

    await openRetentionModal(page);
    await setIndefiniteRetention(page);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '∞');

    // Indefinite back to custom
    await openRetentionModal(page);
    await setCustomRetention(page, '30', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '30 days');
  });

  test('should switch between different custom time units', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);

    // Days -> Hours -> Minutes -> Seconds
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '7 days');

    await openRetentionModal(page);
    await setCustomRetention(page, '168', 'h');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '168 hours');

    await openRetentionModal(page);
    await setCustomRetention(page, '10080', 'm');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '10080 minutes');

    await openRetentionModal(page);
    await setCustomRetention(page, '604800', 's');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '604800 seconds');
  });

  test('should cancel mode change without saving', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await setIndefiniteRetention(page);
    // Cancel without saving
    await page.getByTestId(RETENTION_TEST_IDS.cancelButton).click();

    // Original inherit mode should still be active
    await verifyRetentionDisplay(page, '∞');
  });

  test('should maintain mode selection when reopening modal', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setIndefiniteRetention(page);
    await saveRetentionChanges(page);

    // Reopen modal - indefinite should still be selected
    await openRetentionModal(page);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '∞');
  });

  test('should persist indefinite retention after page refresh', async ({ page, pageObjects }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setIndefiniteRetention(page);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '∞');

    // Refresh page
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
    await verifyRetentionDisplay(page, '∞');
  });
});
