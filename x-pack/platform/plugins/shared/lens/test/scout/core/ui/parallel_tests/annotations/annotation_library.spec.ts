/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  createLogstashLensEditorSuiteSetup,
  deleteAnnotationGroupFromLibrary,
  getImportedDashboardId,
  spaceTest,
  testData,
} from '../../fixtures';

// Titles of the saved objects shipped by `KBN_ARCHIVE_PATHS.ANNOTATION_LIBRARY`.
const ANNOTATION_GROUP_TITLE = 'library annotation group';
const FIRST_VIS_TITLE = 'first visualization';
const DASHBOARD_TITLE = 'annotation sync test dashboard';

// Shares no words with ANNOTATION_GROUP_TITLE: saving must not hit the duplicate-title prompt,
// and the library search that deletes ANNOTATION_GROUP_TITLE must not match this one either.
const NEW_ANNOTATION_GROUP_TITLE = 'saved from the editor';

spaceTest.describe('Lens annotation library', { tag: '@local-stateful-classic' }, () => {
  // Tests open Lens or Dashboard themselves, so don't open an editor upfront.
  const suiteSetup = createLogstashLensEditorSuiteSetup({ skipEmptyLensOpen: true });
  let dashboardId: string;

  // The library group, the Lens chart linked to it and a dashboard holding that chart plus a
  // by-value clone come from the archive, so every test (and every retry, which runs in a
  // fresh worker/space) starts from the same state within its own timeout budget.
  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    await suiteSetup.beforeAll({ scoutSpace, apiServices });
    const imported = await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.ANNOTATION_LIBRARY
    );
    dashboardId = getImportedDashboardId(imported, DASHBOARD_TITLE);
  });

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'saves a new annotation layer to the library under a new tag',
    async ({ page, pageObjects: { lens, saveModal } }) => {
      await suiteSetup.openEmptyLensEditor({ lens });
      await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

      await lens.layers.createLayer('annotations');
      await lens.layers.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

      await expect(saveModal.modal).toBeVisible();
      await saveModal.fillTitle(NEW_ANNOTATION_GROUP_TITLE);
      await saveModal.fillDescription('my description');
      await saveModal.createAndSelectTag({ name: 'my-new-tag', color: '#FFCC33' });
      await saveModal.confirm();

      // Confirms this specifically saved a library-linked annotation group (as opposed to a
      // plain save). Scoped to the toast list so it can't match the same copy rendered
      // elsewhere on the page.
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        'View or manage in the annotation library.'
      );
    }
  );

  spaceTest(
    'adds a saved annotation group from the library to a new chart',
    async ({ pageObjects: { lens } }) => {
      await suiteSetup.openEmptyLensEditor({ lens });
      await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

      await lens.layers.createLayer('annotations', ANNOTATION_GROUP_TITLE);
      // Adding a layer from the library is async (fetches the saved annotation group before
      // the new tab renders), so poll rather than reading the layer count synchronously.
      await expect.poll(() => lens.layers.getLayerCount()).toBe(2);
    }
  );

  spaceTest(
    'syncs annotation-group edits across cloned dashboard panels via inline edit',
    async ({ page, pageObjects: { lens, dashboard } }) => {
      await dashboard.openDashboardWithId(dashboardId);

      // Text visibility is off by default, so neither panel shows annotation text yet.
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(0);

      await dashboard.ensureEditMode();
      await dashboard.clickPanelAction('embeddablePanelAction-editPanel', FIRST_VIS_TITLE);
      await expect(lens.workspace.inlineEditor).toBeVisible();

      // Unlike the standalone editor, the inline flyout mounts a fresh Lens editor frame
      // asynchronously, so the layer tabs may not exist yet; `activateLayerTab` polls for
      // them rather than assuming a snapshot read is already settled.
      await lens.layers.activateLayerTab(1);
      await lens.dimensions.openDimensionEditor(
        'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
        1
      );
      await lens.style.setAnnotationTextVisibility('name');
      await lens.closeDimensionEditor();

      // "Apply and close" auto-saves the linked annotation group to the library and
      // propagates the update to the other, independently-rendered cloned panel.
      await applyLensInlineEditorAndWaitClosed({ lens });
      await dashboard.waitForRenderComplete();

      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(2);
    }
  );

  // Deletes the shared library group, so this stays the last test in the file.
  spaceTest(
    'removes the annotation layer from the editor and dashboard panel once its library group is deleted',
    async ({ page, pageObjects: { visualize, lens, dashboard } }) => {
      // Establish the precondition in this test rather than relying on the previous one: both
      // panels render the linked annotation's marker. Assert the icon, not the text, because the
      // archive ships the group with text visibility off (a fresh worker restores that state).
      const annotationIcons = page.testSubj.locator('xyVisAnnotationIcon');
      await dashboard.openDashboardWithId(dashboardId);
      await expect(annotationIcons).toHaveCount(2);

      await deleteAnnotationGroupFromLibrary(page, ANNOTATION_GROUP_TITLE);

      await visualize.goto();
      await visualize.openSavedVisualization(FIRST_VIS_TITLE, { waitFor: 'lens' });
      // Dropping the layer happens once the editor resolves the now-missing library group,
      // so poll instead of reading the count as soon as the editor renders.
      await expect.poll(() => lens.layers.getLayerCount()).toBe(1);

      await dashboard.openDashboardWithId(dashboardId);
      await expect(annotationIcons).toHaveCount(0);
    }
  );
});
