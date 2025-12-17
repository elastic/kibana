/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  test,
  getUniqueStreamName,
  getUniqueClassicStreamName,
  safeDeleteStream,
  safeClearStreamProcessors,
} from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  toggleInheritSwitch,
  verifyRetentionDisplay,
} from '../../../fixtures/retention_helpers';

test.describe(
  'Stream data retention - custom retention periods',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // Store the stream name created for this test file's worker
    let testStreamName: string;

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
      await browserAuth.loginAsAdmin();

      // Generate unique stream name for this worker
      testStreamName = getUniqueStreamName(testInfo, 'retention');

      // Clean up only this worker's stream (if it exists from a previous run)
      await safeDeleteStream(apiServices, testStreamName);

      // Create a test stream with routing rules
      await apiServices.streams.forkStream('logs', testStreamName, {
        field: 'service.name',
        eq: `retention-test-w${testInfo.parallelIndex}`,
      });

      await pageObjects.streams.gotoDataRetentionTab(testStreamName);
    });

    test.afterEach(async ({ apiServices, page }) => {
      await closeToastsIfPresent(page);
      // Clean up only this worker's stream
      await safeDeleteStream(apiServices, testStreamName);
    });

    test('should set and reset retention policy', async ({ page }) => {
      // Set a specific retention policy
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '7', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '7 days');

      // Reset to inherit
      await openRetentionModal(page);
      await toggleInheritSwitch(page, true);
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '∞');
    });

    test('should set retention with days unit', async ({ page }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '30', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '30 days');
    });

    test('should set retention with hours unit', async ({ page }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '24', 'h');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '24 hours');
    });

    test('should set retention with minutes unit', async ({ page }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '60', 'm');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '60 minutes');
    });

    test('should set retention with seconds unit', async ({ page }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '3600', 's');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '3600 seconds');
    });

    test('should persist retention value across page refresh', async ({ page, pageObjects }) => {
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '30', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '30 days');

      // Refresh the page using the unique stream name
      await pageObjects.streams.gotoDataRetentionTab(testStreamName);

      // Verify the value persists
      await verifyRetentionDisplay(page, '30 days');
    });

    test('should set retention on classic stream', async ({
      page,
      pageObjects,
      logsSynthtraceEsClient,
      apiServices,
    }, testInfo) => {
      // Use a unique classic stream name per worker
      const classicStreamName = getUniqueClassicStreamName(testInfo, 'retention-classic');

      await generateLogsData(logsSynthtraceEsClient)({ index: classicStreamName });
      await safeClearStreamProcessors(apiServices, classicStreamName);
      await pageObjects.streams.gotoDataRetentionTab(classicStreamName);

      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '7', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '7 days');

      // Clean up the classic stream
      await safeDeleteStream(apiServices, classicStreamName);
    });
  }
);
