/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { omit } from 'lodash';
import { test, getUniqueStreamName, safeDeleteStream } from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  toggleInheritSwitch,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe(
  'Stream data retention - storage metrics integration',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let testStreamName: string;

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
      await browserAuth.loginAsAdmin();

      // Generate unique stream name for this worker
      testStreamName = getUniqueStreamName(testInfo, 'storage-metrics');
      await safeDeleteStream(apiServices, testStreamName);

      // Reset parent 'logs' stream to default indefinite retention (DSL with no data_retention)
      const logsDefinition = await apiServices.streams.getStreamDefinition('logs');
      await apiServices.streams.updateStream('logs', {
        ingest: {
          ...logsDefinition.stream.ingest,
          processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
          lifecycle: { dsl: {} },
        },
      });

      await apiServices.streams.forkStream('logs', testStreamName, {
        field: 'service.name',
        eq: `storage-metrics-w${testInfo.parallelIndex}`,
      });
      await pageObjects.streams.gotoDataRetentionTab(testStreamName);
    });

    test.afterEach(async ({ apiServices, page }) => {
      await closeToastsIfPresent(page);
      await safeDeleteStream(apiServices, testStreamName);
    });

    test('should update retention without affecting storage display', async ({ page }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '7', 'd');
      await saveRetentionChanges(page);

      // Retention should be updated
      await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('7 days');

      // Storage metrics should still be visible/unchanged
      // (exact verification depends on storage metrics implementation)
    });

    test('should maintain retention display after page navigation', async ({
      page,
      pageObjects,
    }) => {
      // Set retention
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '14', 'd');
      await saveRetentionChanges(page);

      // Navigate away and back
      await pageObjects.streams.gotoPartitioningTab(testStreamName);
      await pageObjects.streams.gotoDataRetentionTab(testStreamName);

      // Retention should still be displayed correctly
      await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('14 days');
    });

    // Note: Additional storage metrics tests require:
    // 1. Storage size card to be implemented and have test IDs
    // 2. Rollover card to be implemented and have test IDs
    // 3. API to return actual storage metrics
    //
    // These tests focus on retention card integration within the lifecycle tab
  }
);
