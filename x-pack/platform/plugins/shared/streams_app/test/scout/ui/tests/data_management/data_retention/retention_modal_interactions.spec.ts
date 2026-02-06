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
  closeRetentionModal,
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  toggleInheritSwitch,
  verifyRetentionDisplay,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - modal interactions', { tag: ['@ess', '@svlOblt'] }, () => {
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

  test('should open and close modal', async ({ page }) => {
    const modal = await openRetentionModal(page);
    await expect(modal).toBeVisible();

    // Test cancel button closes modal
    await closeRetentionModal(page, 'cancel');
    await expect(page.getByTestId(RETENTION_TEST_IDS.modal)).toBeHidden();
  });

  test('should preserve values on cancel and update on save', async ({ page }) => {
    // Set initial value
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '7 days');

    // Open modal, change value, but cancel - original preserved
    await openRetentionModal(page);
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill('14');
    await closeRetentionModal(page, 'cancel');
    await verifyRetentionDisplay(page, '7 days');

    // Open modal again, save new value - value updates
    await openRetentionModal(page);
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill('30');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '30 days');
  });
});
