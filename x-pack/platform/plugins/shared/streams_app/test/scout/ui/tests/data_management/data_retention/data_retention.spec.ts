/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../../fixtures';
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
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.enable();
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
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
      await apiServices.streams.disable();
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

      // Refresh the page
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      // Verify the value persists
      await verifyRetentionDisplay(page, '30 days');
    });

    test('should set retention on classic stream', async ({
      page,
      pageObjects,
      logsSynthtraceEsClient,
      apiServices,
    }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '7', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '7 days');
    });
  }
);
