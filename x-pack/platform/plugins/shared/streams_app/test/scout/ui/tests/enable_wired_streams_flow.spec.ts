/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

// Common test IDs
const WIRED_SWITCH = 'streamsWiredSwitch';
const DISABLE_MODAL = 'streamsWiredDisableModal';
const DISABLE_CHECKBOX = 'streamsWiredDisableConfirmCheckbox';
const DISABLE_BUTTON = 'streamsWiredDisableConfirmButton';

test.describe('Enable Wired Streams - Success flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects, esClient, apiServices }) => {
    await browserAuth.loginAsAdmin();

    // Disable wired streams to ensure clean state
    try {
      await apiServices.streams.disable();
    } catch {
      // Already disabled, that's fine
    }

    // Ensure logs index/data stream doesn't exist
    try {
      await esClient.indices.deleteDataStream({ name: 'logs' });
    } catch {
      // Data stream doesn't exist, try regular index
      try {
        await esClient.indices.delete({ index: 'logs' });
      } catch {
        // Nothing exists, that's fine
      }
    }

    await pageObjects.streams.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    // Restore globally enabled wired streams
    await apiServices.streams.enable();
  });

  test('should enable wired streams and show logs stream in the UI', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    const settingsFlyoutTitle = page.locator('#streamsSettingsFlyoutTitle');

    // Verify logs index doesn't exist
    const logsExists = await esClient.indices.exists({ index: 'logs' });
    expect(logsExists).toBe(false);

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

    // Verify logs index was created
    await expect
      .poll(() => esClient.indices.exists({ index: 'logs' }), {
        message: 'logs index should be created after enabling wired streams',
      })
      .toBe(true);

    // Verify logs stream appears in the UI
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);
  });

  test('should show the root logs stream after enabling wired streams', async ({
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

    // Verify logs stream is visible with data
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);
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

    // Verify logs stream is visible
    await pageObjects.streams.goto();
    await pageObjects.streams.expectStreamsTableVisible();
    await pageObjects.streams.verifyStreamsAreInTable(['logs']);

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

    // Verify UI now shows empty state (no logs stream)
    await pageObjects.streams.goto();
    await pageObjects.streams.verifyStreamsAreNotInTable(['logs']);
  });
});

test.describe('Enable Wired Streams - Permissions', { tag: ['@ess', '@svlOblt'] }, () => {
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
});
