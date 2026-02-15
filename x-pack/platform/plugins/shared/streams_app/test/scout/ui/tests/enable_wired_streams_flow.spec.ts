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
const DISABLE_MODAL = 'streamsWiredDisableModal';
const DISABLE_CHECKBOX = 'streamsWiredDisableConfirmCheckbox';
const DISABLE_BUTTON = 'streamsWiredDisableConfirmButton';

test.describe(
  'Enable Wired Streams - Success flow',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects, esClient, apiServices }) => {
      await browserAuth.loginAsAdmin();

      // Disable wired streams to ensure clean state
      try {
        await apiServices.streams.disable();
      } catch {
        // Already disabled, that's fine
      }

      // Ensure logs.otel and logs.ecs data streams don't exist
      for (const stream of ['logs.otel', 'logs.ecs']) {
        try {
          await esClient.indices.deleteDataStream({ name: stream });
        } catch {
          // Data stream doesn't exist, try regular index
          try {
            await esClient.indices.delete({ index: stream });
          } catch {
            // Nothing exists, that's fine
          }
        }
      }

      await pageObjects.streams.goto();
    });

    test.afterAll(async ({ apiServices }) => {
      // Restore globally enabled wired streams
      await apiServices.streams.enable();
    });

    test('should enable wired streams and show logs.otel and logs.ecs streams in the UI', async ({
      page,
      pageObjects,
      esClient,
    }) => {
      const settingsFlyoutTitle = page.locator('#streamsSettingsFlyoutTitle');

      // Verify logs.otel and logs.ecs indices don't exist
      const logsOtelExists = await esClient.indices.exists({ index: 'logs.otel' });
      const logsEcsExists = await esClient.indices.exists({ index: 'logs.ecs' });
      expect(logsOtelExists).toBe(false);
      expect(logsEcsExists).toBe(false);

      // Open settings and enable wired streams
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(settingsFlyoutTitle).toBeVisible();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeVisible();
      await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

      await page.getByTestId(WIRED_SWITCH).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();

      // Close flyout with Escape key
      await page.keyboard.press('Escape');
      await expect(settingsFlyoutTitle).toBeHidden();

      // Verify logs.otel and logs.ecs indices were created
      await expect
        .poll(() => esClient.indices.exists({ index: 'logs.otel' }), {
          message: 'logs.otel index should be created after enabling wired streams',
        })
        .toBe(true);
      await expect
        .poll(() => esClient.indices.exists({ index: 'logs.ecs' }), {
          message: 'logs.ecs index should be created after enabling wired streams',
        })
        .toBe(true);

      // Verify logs.otel and logs.ecs streams appear in the UI
      await pageObjects.streams.goto();
      await pageObjects.streams.expectStreamsTableVisible();
      await pageObjects.streams.verifyStreamsAreInTable(['logs.otel', 'logs.ecs']);
    });

    test('should show the root logs.otel and logs.ecs streams after enabling wired streams', async ({
      page,
      pageObjects,
    }) => {
      const settingsFlyoutTitle = page.locator('#streamsSettingsFlyoutTitle');

      // Enable wired streams
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(settingsFlyoutTitle).toBeVisible();
      await page.getByTestId(WIRED_SWITCH).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();

      // Close flyout with Escape key
      await page.keyboard.press('Escape');
      await expect(settingsFlyoutTitle).toBeHidden();

      // Reload page to see updated streams
      await pageObjects.streams.goto();
      await pageObjects.streams.expectStreamsTableVisible();

      // Verify logs.otel and logs.ecs streams are visible
      await pageObjects.streams.verifyStreamsAreInTable(['logs.otel', 'logs.ecs']);
    });

    test('should disable wired streams and show empty state', async ({ page, pageObjects }) => {
      const settingsFlyoutTitle = page.locator('#streamsSettingsFlyoutTitle');

      // First enable wired streams
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(settingsFlyoutTitle).toBeVisible();
      await page.getByTestId(WIRED_SWITCH).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
      // Close flyout with Escape key
      await page.keyboard.press('Escape');
      await expect(settingsFlyoutTitle).toBeHidden();

      // Verify logs.otel and logs.ecs streams are visible
      await pageObjects.streams.goto();
      await pageObjects.streams.expectStreamsTableVisible();
      await pageObjects.streams.verifyStreamsAreInTable(['logs.otel', 'logs.ecs']);

      // Now disable wired streams
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByTestId(WIRED_SWITCH)).toBeChecked();
      await page.getByTestId(WIRED_SWITCH).click();

      // Confirm modal appears with destructive warning
      await expect(page.getByTestId(DISABLE_MODAL)).toBeVisible();

      // Must check confirmation before disabling
      await expect(page.getByTestId(DISABLE_BUTTON)).toBeDisabled();
      await page.getByTestId(DISABLE_CHECKBOX).click();
      await expect(page.getByTestId(DISABLE_BUTTON)).toBeEnabled();

      // Confirm disable
      await page.getByTestId(DISABLE_BUTTON).click();
      await expect(page.getByTestId(DISABLE_MODAL)).toBeHidden();
      await expect(page.getByTestId(WIRED_SWITCH)).not.toBeChecked();

      // Close flyout with Escape key
      await page.keyboard.press('Escape');
      await expect(settingsFlyoutTitle).toBeHidden();

      // Verify UI now shows empty state (no logs.otel or logs.ecs streams)
      await pageObjects.streams.goto();
      await pageObjects.streams.verifyStreamsAreNotInTable(['logs.otel', 'logs.ecs']);
    });
  }
);
