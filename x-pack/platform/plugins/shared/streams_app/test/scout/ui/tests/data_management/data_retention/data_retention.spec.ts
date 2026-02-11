/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
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
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
    });

    // Smoke test: Verifies the complete retention UI workflow
    // Detailed retention value tests (7d, 30d, 90d, hours, etc.) are covered by API tests
    // in test/scout/api/tests/lifecycle_retention.spec.ts
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

    // Smoke test: Verifies persistence across page refresh (UI-specific behavior)
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

    // Smoke test: Verifies classic stream retention UI workflow
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

    test('should open DSL lifecycle phase popup and display phase details', async ({
      page,
      config,
    }) => {
      // Set a custom retention to have a DSL lifecycle with a delete phase
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '30', 'd');
      await saveRetentionChanges(page);

      // DSL phase label differs: 'Hot' in stateful, 'Successful ingest' in serverless
      // Click on the phase button using test ID
      await page
        .getByTestId(`lifecyclePhase-${config.serverless ? 'Successful ingest' : 'Hot'}-button`)
        .click();

      // Verify the popover opens and shows the expected content
      await expect(
        page.getByTestId(
          `lifecyclePhase-${config.serverless ? 'Successful ingest' : 'Hot'}-popoverTitle`
        )
      ).toBeVisible();
      await expect(
        page.getByTestId(
          `lifecyclePhase-${config.serverless ? 'Successful ingest' : 'Hot'}-popoverContent`
        )
      ).toBeVisible();

      // Close the popover by pressing Escape
      await page.keyboard.press('Escape');
    });
  }
);
