/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_security.ts
 * (the "global canvas read-only privileges" describe block — 5 UI `it` blocks).
 *
 * Verifies that a user with canvas:read privileges:
 *   1. Sees Canvas in the navigation.
 *   2. Sees a disabled "Create workpad" button on the listing page.
 *   3. Sees the "Read only" badge in the application header.
 *   4. Cannot create a workpad (navigating to workpad/create redirects to listing
 *      with the button still disabled).
 *   5. Cannot edit a workpad (add-element button is absent on the workpad page).
 *
 * Auth: Uses CANVAS_VIEWER_ROLE (canvas:read + logstash-* read).
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe('Canvas security — canvas:read privileges', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_VIEWER_ROLE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('shows Canvas in the navigation', async ({
    page,
    pageObjects: { home, collapsibleNav },
  }) => {
    // Expand the collapsible nav (it may be collapsed by default) before asserting the link.
    await home.goto();
    await collapsibleNav.expandNav();
    const canvasNavLink = page.testSubj
      .locator('collapsibleNavAppLink')
      .filter({ hasText: 'Canvas' });
    await expect(canvasNavLink).toBeVisible({ timeout: 15_000 });
  });

  test('Canvas listing page', async ({ pageObjects: { canvas } }) => {
    await test.step('shows disabled "Create workpad" button', async () => {
      await canvas.gotoListing();
      await expect(canvas.createWorkpadButton).toBeVisible();
      await expect(canvas.createWorkpadButton).toBeDisabled();
    });

    await test.step('shows "Read only" badge', async () => {
      await expect(canvas.headerBadge).toBeVisible({ timeout: 15_000 });
      await expect(canvas.headerBadge).toHaveAttribute('data-test-badge-label', /read only/i);
    });
  });

  test('navigating to workpad/create redirects back to listing with button disabled', async ({
    pageObjects: { canvas },
  }) => {
    // canvas:read users cannot create workpads; the app redirects them back to
    // the listing page where the create button remains disabled.
    await canvas.gotoWorkpad('create');
    await expect(canvas.createWorkpadButton).toBeVisible({ timeout: 20_000 });
    await expect(canvas.createWorkpadButton).toBeDisabled();
  });

  test('workpad does not show add-element button (view-only mode)', async ({
    pageObjects: { canvas },
  }) => {
    await canvas.gotoWorkpad(testData.TEST_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible({ timeout: 20_000 });
    // Wait for workpad to finish loading (refresh control is visible when loaded)
    await expect(canvas.refreshControl).toBeVisible({ timeout: 20_000 });
    await expect(canvas.addElementButton).toBeHidden();
  });
});
