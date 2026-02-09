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
  toggleInheritSwitch,
  verifyRetentionDisplay,
  verifyInheritSwitchVisible,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - inheritance', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ apiServices, browserAuth }) => {
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
  });

  test.afterEach(async ({ apiServices, page }) => {
    await closeToastsIfPresent(page);
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    // Clear existing rules
    await apiServices.streams.clearStreamChildren('logs');
  });

  test('should show inherit toggle and inherit by default', async ({
    apiServices,
    pageObjects,
    page,
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

    // Child should inherit indefinite from parent by default
    await verifyRetentionDisplay(page, '∞');

    // Should have inherit toggle
    await openRetentionModal(page);
    await verifyInheritSwitchVisible(page);
    const inheritSwitch = page.getByTestId(RETENTION_TEST_IDS.inheritSwitch);
    await expect(inheritSwitch).toBeChecked();
  });

  test('should toggle inherit mode on and off', async ({ apiServices, pageObjects, page }) => {
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

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
  }) => {
    // Create parent child
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });

    // Create nested child
    await apiServices.streams.forkStream('logs.nginx', 'logs.nginx.access', {
      field: 'log.level',
      eq: 'info',
    });

    await pageObjects.streams.gotoDataRetentionTab('logs.nginx.access');
    await verifyRetentionDisplay(page, '∞');

    // Should have inherit toggle
    await openRetentionModal(page);
    await verifyInheritSwitchVisible(page);
  });

  test('should allow override on nested child stream', async ({
    apiServices,
    pageObjects,
    page,
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await apiServices.streams.forkStream('logs.nginx', 'logs.nginx.access', {
      field: 'log.level',
      eq: 'info',
    });

    await pageObjects.streams.gotoDataRetentionTab('logs.nginx.access');

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
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await apiServices.streams.forkStream('logs', 'logs.apache', {
      field: 'service.name',
      eq: 'apache',
    });

    // Both should inherit from logs
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
    await verifyRetentionDisplay(page, '∞');

    await pageObjects.streams.gotoDataRetentionTab('logs.apache');
    await verifyRetentionDisplay(page, '∞');
  });

  test('should reflect parent retention changes in child when inheriting', async ({
    apiServices,
    pageObjects,
    page,
  }) => {
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });

    // Set parent retention
    await pageObjects.streams.gotoDataRetentionTab('logs');
    await openRetentionModal(page);
    await setCustomRetention(page, '30', 'd');
    await saveRetentionChanges(page);

    // Check child inherits the value
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
    await verifyRetentionDisplay(page, '30 days');
  });
});
