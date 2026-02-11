/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

// Common test IDs
const WIRED_SWITCH = 'streamsWiredSwitch';

test.describe(
  'Enable Wired Streams - Permissions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ esClient, apiServices, browserAuth }) => {
      // Disable wired streams to get clean state
      await browserAuth.loginAsAdmin();
      try {
        await apiServices.streams.disable();
      } catch {
        // Ignore if already disabled
      }

      // Clean up logs index/data stream
      try {
        await esClient.indices.deleteDataStream({ name: 'logs' });
      } catch {
        try {
          await esClient.indices.delete({ index: 'logs' });
        } catch {
          // Nothing exists
        }
      }
    });

    test.afterAll(async ({ apiServices }) => {
      // Restore globally enabled wired streams
      await apiServices.streams.enable();
    });

    test('should prevent editor users from enabling wired streams', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAs('editor');
      await pageObjects.streams.goto();

      // Open settings
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();

      // Switch should be disabled for editor
      await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
    });

    test('should prevent viewer users from enabling wired streams', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.streams.goto();

      // Open settings
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();

      // Switch should be disabled for viewer
      await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
    });

    test('should prevent editor from disabling wired streams', async ({
      browserAuth,
      page,
      pageObjects,
      apiServices,
    }) => {
      // Enable as admin first
      await browserAuth.loginAsAdmin();
      await apiServices.streams.enable();
      await pageObjects.streams.goto();

      // Login as editor
      await browserAuth.loginAs('editor');
      await pageObjects.streams.goto();

      // Verify logs stream is visible (wired streams enabled)
      await pageObjects.streams.expectStreamsTableVisible();
      await pageObjects.streams.verifyStreamsAreInTable(['logs']);

      // Open settings
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();

      // Switch should show enabled but be disabled for editor
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
    });

    test('should prevent viewer from disabling wired streams', async ({
      browserAuth,
      page,
      pageObjects,
      apiServices,
    }) => {
      // Enable as admin first
      await browserAuth.loginAsAdmin();
      await apiServices.streams.enable();
      await pageObjects.streams.goto();

      // Login as viewer
      await browserAuth.loginAsViewer();
      await pageObjects.streams.goto();

      // Verify logs stream is visible (wired streams enabled)
      await pageObjects.streams.expectStreamsTableVisible();
      await pageObjects.streams.verifyStreamsAreInTable(['logs']);

      // Open settings
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();

      // Switch should show enabled but be disabled for viewer
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeDisabled();
    });
  }
);
