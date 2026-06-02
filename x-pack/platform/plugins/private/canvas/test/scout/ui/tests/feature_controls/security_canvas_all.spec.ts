/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_security.ts
 * (the "global canvas all privileges" describe block — 5 UI `it` blocks).
 *
 * Verifies that a user with canvas:all privileges can:
 *   1. See Canvas in the navigation.
 *   2. See the "Create workpad" button enabled on the listing page.
 *   3. Not see a read-only badge.
 *   4. Create a new workpad.
 *   5. Open and edit an existing workpad.
 *
 * Auth: Uses CANVAS_EDITOR_ROLE (canvas:all + logstash-* read).
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe('Canvas security — canvas:all privileges', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_EDITOR_ROLE);
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
    await test.step('shows enabled "Create workpad" button', async () => {
      await canvas.gotoListing();
      await expect(canvas.createWorkpadButton).toBeVisible();
      await expect(canvas.createWorkpadButton).toBeEnabled();
    });

    await test.step('shows no read-only badge', async () => {
      await expect(canvas.headerBadge).not.toBeVisible({ timeout: 10_000 });
    });

    await test.step('allows a workpad to be created', async () => {
      await canvas.createNewWorkpad();
      await expect(canvas.addElementButton).toBeVisible({ timeout: 20_000 });
    });
  });

  test('allows an existing workpad to be opened and edited', async ({
    pageObjects: { canvas },
  }) => {
    await canvas.gotoWorkpad(testData.TEST_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible({ timeout: 20_000 });
    await expect(canvas.addElementButton).toBeVisible({ timeout: 20_000 });
  });
});
