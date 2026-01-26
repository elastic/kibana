/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Lens page', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.lens.navigateTo();
  });

  test('should display the Lens page', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await expect(lens.getLensApp()).toBeVisible();
  });

  test('should show workspace panel when navigating to Lens', async ({ pageObjects, page }) => {
    const { lens } = pageObjects;

    // Verify the main Lens app is loaded
    await expect(lens.getLensApp()).toBeVisible();

    // Verify the workspace panel is present - this is where visualizations are built
    const workspacePanel = page.getByTestId('lnsWorkspacePanelWrapper__innerContent');
    await expect(workspacePanel).toBeVisible();
  });

  test('should display toasts when interacting with the page', async ({ pageObjects, page }) => {
    const { lens, toasts } = pageObjects;

    // Verify Lens loaded
    await expect(lens.getLensApp()).toBeVisible();

    // Example: Check that no error toasts are present initially
    // (In a real test, you might trigger an action that shows a toast)
    const toastList = page.getByTestId('globalToastList');
    const hasErrorToast = await toastList
      .locator('[data-test-subj="errorToastMessage"]')
      .count()
      .then((count) => count > 0);

    // For this learning example, we expect no error toasts on initial load
    expect(hasErrorToast).toBe(false);
  });

  test('should use Scout page helpers - testSubj API', async ({ page }) => {
    // Scout provides a convenient testSubj API for interacting with data-test-subj elements
    // Instead of: page.getByTestId('lnsApp')
    // You can use: page.testSubj.click('lnsApp')

    // Check that the Lens app element exists using testSubj
    const lensAppExists = await page.testSubj.exists('lnsApp');
    expect(lensAppExists).toBe(true);

    // Get text content using testSubj
    // Note: This is demonstrating the API, actual text may vary
    const appElement = page.testSubj.locator('lnsApp');
    await expect(appElement).toBeVisible();
  });
});
