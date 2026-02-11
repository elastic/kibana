/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { omit } from 'lodash';
import { test } from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  setIndefiniteRetention,
  testRetentionConfigurations,
  toggleInheritSwitch,
  verifyRetentionDisplay,
  verifyRetentionBadge,
  BADGE_TEXT,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - display values', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamChildren('logs');

    // Reset parent 'logs' stream to default indefinite retention (DSL with no data_retention)
    const logsDefinition = await apiServices.streams.getStreamDefinition('logs');
    await apiServices.streams.updateStream('logs', {
      ingest: {
        ...logsDefinition.stream.ingest,
        processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
        lifecycle: { dsl: {} },
      },
    });

    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  });
  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
  });

  test('should display singular and plural time units correctly', async ({ page }) => {
    // Test singular (1 day)
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '1', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '1 day');

    // Test plural (7 days)
    await openRetentionModal(page);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '7 days');
  });

  test('should display indefinite as infinity symbol', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setIndefiniteRetention(page);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '∞');
  });

  test('should show custom period badge when custom retention is set', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionBadge(page, BADGE_TEXT.customPeriod);
  });

  test('should display all time units consistently', async ({ page }) => {
    await testRetentionConfigurations(page, [
      { value: '7', unit: 'd', display: '7 days' },
      { value: '24', unit: 'h', display: '24 hours' },
      { value: '60', unit: 'm', display: '60 minutes' },
      { value: '3600', unit: 's', display: '3600 seconds' },
    ]);
  });

  test('should display retention metric prominently', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    const retentionMetric = page.getByTestId(RETENTION_TEST_IDS.retentionMetric);
    await expect(retentionMetric).toBeVisible();
    await expect(retentionMetric).toContainText('7 days');
  });
});
