/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_spaces.ts
 * (the "space with no features disabled" describe block — 4 UI `it` blocks).
 *
 * Verifies Canvas behaviour inside a custom space where no features are disabled:
 *   1. Canvas appears in the navigation when in that space.
 *   2. The listing page shows an enabled "Create workpad" button.
 *   3. A workpad can be created.
 *   4. An existing workpad can be opened for editing.
 *
 * Each test uses a unique space id (per worker) to avoid collisions with parallel runs.
 * The canvas/default KBN archive is loaded into the DEFAULT space (matching the FTR
 * original which also loaded to the default space) so the Test Workpad is accessible
 * when navigating to canvas without a space prefix.
 *
 * Auth: admin (loginAsAdmin) — the FTR original ran with the broad shared role set;
 * admin is the simplest equivalent and covers all Canvas operations.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Canvas spaces — Canvas enabled in custom space',
  { tag: ['@local-stateful-classic'] },
  () => {
    let spaceId: string;

    test.beforeAll(async ({ kbnClient, esArchiver, apiServices }, workerInfo) => {
      spaceId = `canvas-enabled-${workerInfo.parallelIndex}-${Date.now()}`;

      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);

      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        disabledFeatures: [],
      });

      // Canvas marks itself inaccessible (AppStatus.inaccessible) when no workpads
      // exist in the current space, which hides its nav link. Load a workpad into
      // the custom space so Canvas is accessible there.
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT, { space: spaceId });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      await apiServices.spaces.delete(spaceId);
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('Canvas appears in the navigation of the custom space', async ({
      page,
      pageObjects: { home, collapsibleNav },
    }) => {
      await home.goto(spaceId);
      // Expand the collapsible nav (it may be collapsed by default) before asserting the link.
      await collapsibleNav.expandNav();
      const canvasNavLink = page.testSubj
        .locator('collapsibleNavAppLink')
        .filter({ hasText: 'Canvas' });
      await expect(canvasNavLink).toBeVisible();
    });

    test('Canvas listing page', async ({ pageObjects: { canvas } }) => {
      await test.step('shows enabled "Create workpad" button', async () => {
        await canvas.gotoListing();
        await expect(canvas.createWorkpadButton).toBeVisible();
        await expect(canvas.createWorkpadButton).toBeEnabled();
      });

      await test.step('allows a workpad to be created', async () => {
        await canvas.createNewWorkpad();
        await expect(canvas.addElementButton).toBeVisible();
      });
    });

    test('allows an existing workpad to be opened for editing', async ({
      pageObjects: { canvas },
    }) => {
      await canvas.gotoWorkpad(testData.TEST_WORKPAD_ID);
      await expect(canvas.workpadPage).toBeVisible();
      await expect(canvas.addElementButton).toBeVisible();
    });
  }
);
