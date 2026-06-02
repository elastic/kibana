/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/embeddables/visualization.ts
 *
 * Focuses on the Canvas-specific integration points for visualize embeddables:
 *   1. By-reference: adding an existing visualization from the library renders it on the workpad.
 *   2. By-value: creating a new Vega panel via the Canvas editor menu, saving and returning,
 *      adds a rendered panel to the workpad.
 *
 * The FTR suite also renamed panels to "v2" through the Visualize/Vega editors; those steps
 * exercise the editor save-as flow rather than Canvas, so they are trimmed here.
 *
 * Auth: canvas:all + visualize/dashboard access (CANVAS_FULL_EDITOR_ROLE).
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const { VISUALIZATION } = testData.EMBEDDABLES;

test.describe('Canvas visualization embeddable', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD);
    // Canvas is only accessible when at least one workpad exists.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_FULL_EDITOR_ROLE);
    await canvas.gotoListing();
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();
    await canvas.setWorkpadName('visualization tests');
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('adds a by-reference visualization from the library and renders it', async ({
    pageObjects: { canvas },
  }) => {
    await canvas.addEmbeddableFromLibrary(VISUALIZATION.libraryName, 'Visualization');
    await expect(canvas.embeddablePanelHeading(VISUALIZATION.headingId)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('creates a by-value Vega panel via the editor menu', async ({ pageObjects: { canvas } }) => {
    const initialCount = await canvas.getEmbeddableCount();

    await canvas.addNewPanel('Vega');
    await canvas.saveVisualizeAndReturn();

    await expect
      .poll(() => canvas.getEmbeddableCount(), { timeout: 30_000 })
      .toBe(initialCount + 1);
  });
});
