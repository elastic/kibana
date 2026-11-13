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
 *   1. By-reference: adding an existing visualization or Vega library item from the library
 *      renders it on the workpad.
 *   2. By-value: creating a new Vega panel via the Canvas editor menu adds a panel with the
 *      default spec to the workpad (Canvas skips the inline Vega editor).
 *
 * The FTR suite also renamed panels to "v2" through the Visualize/Vega editors and re-edited
 * existing panels; those steps exercise the editor flows rather than Canvas, so they are
 * trimmed here.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const { VISUALIZATION, VEGA } = testData.EMBEDDABLES;
const EXTENDED_TIMEOUT = 20_000;

test.describe('Canvas visualization embeddable', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD);
    // Canvas is only accessible when at least one workpad exists. This archive also holds the
    // Vega library item, which uses inline data so it renders without index privileges.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_FULL_EDITOR_ROLE);
    await canvas.gotoListing();
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('adds a by-reference visualization from the library and renders it', async ({
    pageObjects: { canvas },
  }) => {
    await canvas.addEmbeddableFromLibrary(VISUALIZATION.libraryName, 'Visualization');
    await expect(canvas.embeddablePanelHeading(VISUALIZATION.headingId)).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('adds a by-reference Vega panel from the library and edits it in the library editor', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await canvas.addEmbeddableFromLibrary(VEGA.libraryName, 'Vega');
    await expect(canvas.embeddablePanelHeading(VEGA.headingId)).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    await canvas.editPanel(VEGA.libraryName);
    await expect(page.testSubj.locator('vegaLibraryEditorBody')).toBeVisible();
  });

  test('creates a by-value Vega panel via the editor menu', async ({ pageObjects: { canvas } }) => {
    await canvas.addNewPanel('Vega');

    // A fresh workpad starts empty, so adding the Vega panel adds exactly one panel.
    await expect.poll(() => canvas.getEmbeddableCount(), { timeout: EXTENDED_TIMEOUT }).toBe(1);
  });
});
