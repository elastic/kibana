/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/embeddables/maps.ts
 *
 * Focuses on the Canvas-specific integration with Maps: creating a new (by-value) map panel
 * via the Canvas editor menu, saving and returning, adds a rendered map to the workpad.
 *
 * The FTR suite also covered a by-reference flow, but it depended on a map saved to the
 * library *earlier in the same suite* (shared mutable state). Since Scout gives each test a
 * fresh context and the default archive ships no map saved object, that flow is dropped here;
 * by-reference embedding is already covered by the saved-search/visualization/lens specs.
 *
 * The FTR edit flows (re-opening a panel's editor and saving back) are also de-scoped: the
 * by-value creation test below already exercises the editor → save-and-return path.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const EXTENDED_TIMEOUT = 20_000;

test.describe('Canvas maps embeddable', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    // Canvas is only accessible when at least one workpad exists.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_MAPS_ROLE);
    await canvas.gotoListing();
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('creates a by-value map panel via the editor menu', async ({
    page,
    pageObjects: { canvas, maps },
  }) => {
    await canvas.addNewPanel('Maps');
    await maps.saveAndReturnButton.click();

    // A fresh workpad starts empty, so saving the map adds exactly one panel.
    await expect.poll(() => canvas.getEmbeddableCount(), { timeout: EXTENDED_TIMEOUT }).toBe(1);
    // The map renders on the workpad as an embeddable (`mapContainer`), not as the
    // Maps editor (`#maps-plugin`), which only exists while editing.
    await expect(page.testSubj.locator('mapContainer')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  });
});
