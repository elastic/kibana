/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { omit } from 'lodash';
import {
  test,
  getUniqueStreamName,
  getUniqueNestedStreamName,
  safeDeleteStream,
  cleanupTestStreams,
} from '../../../fixtures';
import {
  closeToastsIfPresent,
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  toggleInheritSwitch,
  verifyRetentionDisplay,
  verifyInheritSwitchVisible,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - inheritance', { tag: ['@ess', '@svlOblt'] }, () => {
  // Track all streams created during tests for cleanup
  let createdStreams: string[] = [];

  test.beforeEach(async ({ apiServices, browserAuth }, testInfo) => {
    await browserAuth.loginAsAdmin();
    createdStreams = [];

    // Reset parent 'logs' stream to default indefinite retention (DSL with no data_retention)
    const logsDefinition = await apiServices.streams.getStreamDefinition('logs');
    await apiServices.streams.updateStream('logs', {
      ingest: {
        ...logsDefinition.stream.ingest,
        processing: omit(logsDefinition.stream.ingest.processing, 'updated_at'),
        lifecycle: { dsl: {} },
      },
    });
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    // Clean up all streams created during this test
    await cleanupTestStreams(apiServices, createdStreams);
  });

  test('should show inherit toggle and inherit by default', async ({
    apiServices,
    pageObjects,
    page,
  }, testInfo) => {
    const streamName = getUniqueStreamName(testInfo, 'inherit-default');
    await safeDeleteStream(apiServices, streamName);
    await apiServices.streams.forkStream('logs', streamName, {
      field: 'service.name',
      eq: `inherit-default-w${testInfo.workerIndex}`,
    });
    createdStreams.push(streamName);

    await pageObjects.streams.gotoDataRetentionTab(streamName);

    // Child should inherit indefinite from parent by default
    await verifyRetentionDisplay(page, '∞');

    // Should have inherit toggle
    await openRetentionModal(page);
    await verifyInheritSwitchVisible(page);
    const inheritSwitch = page.getByTestId(RETENTION_TEST_IDS.inheritSwitch);
    await expect(inheritSwitch).toBeChecked();
  });

  test('should toggle inherit mode on and off', async ({ apiServices, pageObjects, page }, testInfo) => {
    const streamName = getUniqueStreamName(testInfo, 'inherit-toggle');
    await safeDeleteStream(apiServices, streamName);
    await apiServices.streams.forkStream('logs', streamName, {
      field: 'service.name',
      eq: `inherit-toggle-w${testInfo.workerIndex}`,
    });
    createdStreams.push(streamName);

    await pageObjects.streams.gotoDataRetentionTab(streamName);

    // Disable inherit - set custom
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '7', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '7 days');

    // Re-enable inherit
    await openRetentionModal(page);
    await toggleInheritSwitch(page, true);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '∞');
  });

  test('should handle inherit for nested child streams', async ({
    apiServices,
    pageObjects,
    page,
  }, testInfo) => {
    // Create parent child
    const parentName = getUniqueStreamName(testInfo, 'inherit-nested');
    await safeDeleteStream(apiServices, parentName);
    await apiServices.streams.forkStream('logs', parentName, {
      field: 'service.name',
      eq: `inherit-nested-w${testInfo.workerIndex}`,
    });
    createdStreams.push(parentName);

    // Create nested child
    const childName = `${parentName}.access`;
    await safeDeleteStream(apiServices, childName);
    await apiServices.streams.forkStream(parentName, childName, {
      field: 'log.level',
      eq: 'info',
    });
    createdStreams.push(childName);

    await pageObjects.streams.gotoDataRetentionTab(childName);
    await verifyRetentionDisplay(page, '∞');

    // Should have inherit toggle
    await openRetentionModal(page);
    await verifyInheritSwitchVisible(page);
  });

  test('should allow override on nested child stream', async ({
    apiServices,
    pageObjects,
    page,
  }, testInfo) => {
    const parentName = getUniqueStreamName(testInfo, 'inherit-override');
    await safeDeleteStream(apiServices, parentName);
    await apiServices.streams.forkStream('logs', parentName, {
      field: 'service.name',
      eq: `inherit-override-w${testInfo.workerIndex}`,
    });
    createdStreams.push(parentName);

    const childName = `${parentName}.access`;
    await safeDeleteStream(apiServices, childName);
    await apiServices.streams.forkStream(parentName, childName, {
      field: 'log.level',
      eq: 'info',
    });
    createdStreams.push(childName);

    await pageObjects.streams.gotoDataRetentionTab(childName);

    // Override retention
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, '14', 'd');
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, '14 days');
  });

  test('should handle multiple child streams inheriting from same parent', async ({
    apiServices,
    pageObjects,
    page,
  }, testInfo) => {
    const stream1 = getUniqueStreamName(testInfo, 'inherit-multi-1');
    const stream2 = getUniqueStreamName(testInfo, 'inherit-multi-2');

    await safeDeleteStream(apiServices, stream1);
    await safeDeleteStream(apiServices, stream2);

    await apiServices.streams.forkStream('logs', stream1, {
      field: 'service.name',
      eq: `inherit-multi-1-w${testInfo.workerIndex}`,
    });
    createdStreams.push(stream1);

    await apiServices.streams.forkStream('logs', stream2, {
      field: 'service.name',
      eq: `inherit-multi-2-w${testInfo.workerIndex}`,
    });
    createdStreams.push(stream2);

    // Both should inherit from logs
    await pageObjects.streams.gotoDataRetentionTab(stream1);
    await verifyRetentionDisplay(page, '∞');

    await pageObjects.streams.gotoDataRetentionTab(stream2);
    await verifyRetentionDisplay(page, '∞');
  });

  test('should reflect parent retention changes in child when inheriting', async ({
    apiServices,
    pageObjects,
    page,
  }, testInfo) => {
    const streamName = getUniqueStreamName(testInfo, 'inherit-parent-change');
    await safeDeleteStream(apiServices, streamName);
    await apiServices.streams.forkStream('logs', streamName, {
      field: 'service.name',
      eq: `inherit-parent-change-w${testInfo.workerIndex}`,
    });
    createdStreams.push(streamName);

    // Set parent retention
    await pageObjects.streams.gotoDataRetentionTab('logs');
    await openRetentionModal(page);
    await setCustomRetention(page, '30', 'd');
    await saveRetentionChanges(page);

    // Check child inherits the value
    await pageObjects.streams.gotoDataRetentionTab(streamName);
    await verifyRetentionDisplay(page, '30 days');

    // Reset parent retention back to indefinite for other tests
    await pageObjects.streams.gotoDataRetentionTab('logs');
    await openRetentionModal(page);
    await toggleInheritSwitch(page, true);
    await saveRetentionChanges(page);
  });
});
