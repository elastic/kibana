/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/feature_controls/canvas_spaces.ts
 * (the "space with Canvas disabled" describe block — UI part only: 1 `it` block).
 *
 * Verifies that when Canvas is disabled in a space, the Canvas navlink is hidden.
 *
 * The two "returns a 404" assertions from the original FTR describe block are
 * HTTP-level checks and have already been migrated as API tests in:
 *   api/tests/feature_controls/canvas_disabled_space.spec.ts
 *
 * Auth: admin (loginAsAdmin) — the FTR original ran with the broad shared role set.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Canvas spaces — Canvas disabled in custom space',
  { tag: testData.CANVAS_UI_TAGS },
  () => {
    let spaceId: string;

    test.beforeAll(async ({ apiServices }, workerInfo) => {
      spaceId = `canvas-disabled-ui-${workerInfo.parallelIndex}-${Date.now()}`;

      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        disabledFeatures: ['canvas'],
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(spaceId);
    });

    test('Canvas navlink is hidden when Canvas is disabled in the space', async ({
      page,
      pageObjects: { canvas, collapsibleNav },
    }) => {
      // Navigate to the space home page so the navigation is rendered in this space context.
      await canvas.gotoInSpace(spaceId);
      // Expand the nav before asserting absence — the nav must be open for links to exist in the DOM.
      await collapsibleNav.expandNav();

      const canvasNavLink = page.testSubj
        .locator('collapsibleNavAppLink')
        .filter({ hasText: 'Canvas' });
      await expect(canvasNavLink).toBeHidden();
    });
  }
);
