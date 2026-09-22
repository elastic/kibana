/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { LensPageObjects } from '../fixtures';
import {
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  createLogstashLensEditorSuiteSetup,
  openPanelInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const ANNOTATION_GROUP_TITLE = 'My by reference annotation group';
const ANNOTATION_DIMENSION = 'lnsXY_xAnnotationsPanel > lns-dimensionTrigger';

/**
 * Opens the archived `lnsXYvis`, saves it as a by-value copy on a new dashboard and
 * opens the panel's inline editor — the shared starting point of every test here.
 */
async function openXyPanelInlineEditor(
  pageObjects: Pick<LensPageObjects, 'dashboard' | 'lens' | 'visualize'>,
  panelTitle: string
) {
  const { dashboard, lens, visualize } = pageObjects;
  await visualize.goto();
  await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.XY_VIS, { waitFor: 'lens' });
  // Re-saving a saved visualization enables the add-to-dashboard radios only after
  // "Save as new visualization" is checked; `saveToLibrary: false` keeps it by-value.
  await lens.save(panelTitle, { addToDashboard: 'new', saveAsNew: true, saveToLibrary: false });
  await dashboard.waitForRenderComplete();
  await openPanelInlineEditorAndWaitVisible({ dashboard, lens });
}

spaceTest.describe(
  'Lens dashboard inline editing - layers',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      // `lnsXYvis` saved visualization is the starting chart for every test.
      loadLensArchives: true,
      // Every test starts from Visualize, not an empty Lens editor.
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);
    spaceTest.beforeEach(suiteSetup.beforeEach);
    spaceTest.afterAll(async ({ kbnClient, scoutSpace, apiServices }) => {
      // The by-reference annotation test saves an `event-annotation-group`, which
      // `cleanStandardList()` does not cover; delete it via API so it cannot leak
      // into the shared worker space even when the test fails mid-way.
      await kbnClient.savedObjects.clean({
        types: ['event-annotation-group'],
        space: scoutSpace.id,
      });
      await suiteSetup.afterAll({ scoutSpace, apiServices });
    });

    spaceTest('adds a by-value annotation layer inline', async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await spaceTest.step('open the panel inline editor', async () => {
        await openXyPanelInlineEditor(pageObjects, 'xyVisChart Copy');
      });

      await spaceTest.step('add an annotation layer', async () => {
        await lens.layers.createLayer('annotations');
        expect(await lens.layers.getLayerCount()).toBe(2);

        await lens.layers.ensureLayerTabIsActive(1);
        await expect(page.testSubj.locator(ANNOTATION_DIMENSION)).toHaveText('Event');
      });

      await spaceTest.step('apply and verify the annotation renders on the panel', async () => {
        await applyLensInlineEditorAndWaitClosed({ lens });
        await dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();
      });
    });

    spaceTest('adds a by-reference annotation layer inline', async ({ page, pageObjects }) => {
      const { lens, saveModal } = pageObjects;

      await spaceTest.step('open the panel inline editor', async () => {
        await openXyPanelInlineEditor(pageObjects, 'xyVisChart Copy 2');
      });

      await spaceTest.step('add an annotation layer and save it to the library', async () => {
        await lens.layers.createLayer('annotations');
        await lens.layers.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

        await expect(saveModal.modal).toBeVisible();
        await saveModal.fillTitle(ANNOTATION_GROUP_TITLE);
        await saveModal.fillDescription('my description');
        await saveModal.confirm();

        // Scoped to the toast list so the same copy elsewhere on the page can't match.
        const toastList = page.testSubj.locator('globalToastList');
        await expect(toastList).toContainText(`Saved "${ANNOTATION_GROUP_TITLE}"`);
        await expect(toastList).toContainText('View or manage in the annotation library.');

        await applyLensInlineEditorAndWaitClosed({ lens });
      });

      await spaceTest.step('reopen the editor and verify the by-ref annotation', async () => {
        await openPanelInlineEditorAndWaitVisible(pageObjects);

        // The inline flyout mounts the layer tabs asynchronously; `activateLayerTab`
        // polls for them before selecting.
        await lens.layers.activateLayerTab(1);
        expect(await lens.layers.getLayerCount()).toBe(2);
        await expect(page.testSubj.locator(ANNOTATION_DIMENSION)).toHaveText('Event');

        await cancelLensInlineEditorAndWaitClosed({ lens });
      });
    });

    spaceTest('adds a reference line layer inline', async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await spaceTest.step('open the panel inline editor', async () => {
        await openXyPanelInlineEditor(pageObjects, 'xyVisChart Copy 3');
      });

      await spaceTest.step('add a reference line layer with a formula and icon', async () => {
        await lens.layers.createLayer('referenceLine');
        expect(await lens.layers.getLayerCount()).toBe(2);
        await lens.layers.ensureLayerTabIsActive(1);

        await lens.configureDimension({
          dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
          operation: 'formula',
          formula: 'count()',
          keepOpen: true,
        });
        // Option label is capitalized ('Bell'); FTR matched the lowercase value instead.
        await page.components.comboBox('lns-icon-select').setSelectedOptions(['Bell']);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step(
        'apply and verify the reference line icon renders on the panel',
        async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
          await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();
        }
      );
    });
  }
);
