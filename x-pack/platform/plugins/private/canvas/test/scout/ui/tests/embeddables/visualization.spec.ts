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
 * The FTR suite also renamed panels to "v2" through the Visualize/Vega editors and re-edited
 * existing panels; those steps exercise the editor save-as/save-and-return flow rather than
 * Canvas (and the by-value creation test below already covers editor → save-and-return), so
 * they are trimmed here.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const { VISUALIZATION } = testData.EMBEDDABLES;
const EXTENDED_TIMEOUT = 20_000;

test.describe('Canvas visualization embeddable', { tag: ['@local-stateful-classic'] }, () => {
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

  test('creates a by-value Vega panel via the editor menu', async ({ pageObjects: { canvas } }) => {
    // In 9.x the Vega action's titleInWizard is "Custom visualization"; on main it is "Vega".
    // The canvas editor-menu data-test-subj is built from the action display name, so we must
    // use the name that matches this branch.
    await canvas.addNewPanel('Custom visualization');
    await canvas.saveVisualizeAndReturn();

    // A fresh workpad starts empty, so saving the Vega panel adds exactly one panel.
    await expect.poll(() => canvas.getEmbeddableCount(), { timeout: EXTENDED_TIMEOUT }).toBe(1);
  });
});
