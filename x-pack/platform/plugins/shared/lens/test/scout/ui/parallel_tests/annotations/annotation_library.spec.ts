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
  spaceTest,
  testData,
} from '../../fixtures';

const ANNOTATION_GROUP_TITLE = 'library annotation group';
const FIRST_VIS_TITLE = 'first visualization';
const SECOND_VIS_TITLE = 'second visualization';
const DASHBOARD_TITLE = 'annotation sync test dashboard';

spaceTest.describe('Lens annotation library', { tag: '@local-stateful-classic' }, () => {
  // The steps below open Visualize, Lens and Dashboard in turn, so don't open an editor upfront.
  const suiteSetup = createLogstashLensEditorSuiteSetup({ skipEmptyLensOpen: true });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'saves an annotation group to the library, syncs edits across dashboard panels, and propagates deletion',
    async ({ page, pageObjects: { visualize, lens, dashboard, saveModal } }) => {
      await spaceTest.step(
        'saves a new annotation layer to the library under a new tag',
        async () => {
          await visualize.goto();
          await visualize.openNewVisualizationWizard();
          await visualize.clickVisType('lens');
          await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

          await lens.createLayer('annotations');
          await lens.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

          await expect(saveModal.modal).toBeVisible();
          await saveModal.fillTitle(ANNOTATION_GROUP_TITLE);
          await saveModal.fillDescription('my description');
          await saveModal.createAndSelectTag({ name: 'my-new-tag', color: '#FFCC33' });
          await saveModal.confirm();

          // Confirms this specifically saved a library-linked annotation group (as opposed to
          // a plain save), which the rest of this test depends on. Scoped to the toast list so
          // it can't match the same copy rendered elsewhere on the page.
          await expect(page.testSubj.locator('globalToastList')).toContainText(
            'View or manage in the annotation library.'
          );

          await lens.save(FIRST_VIS_TITLE, { addToDashboard: 'none' });
        }
      );

      await spaceTest.step(
        'adds the saved annotation group from the library to a new chart',
        async () => {
          await visualize.goto();
          await visualize.openNewVisualizationWizard();
          await visualize.clickVisType('lens');
          await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

          await lens.createLayer('annotations', ANNOTATION_GROUP_TITLE);
          // Adding a layer from the library is async (fetches the saved annotation group before
          // the new tab renders), so poll rather than reading the layer count synchronously.
          await expect.poll(() => lens.getLayerCount()).toBe(2);

          await lens.save(SECOND_VIS_TITLE, { addToDashboard: 'none' });
        }
      );

      await spaceTest.step(
        'syncs annotation-group edits across cloned dashboard panels via inline edit',
        async () => {
          await dashboard.openNewDashboard();
          await dashboard.addEmbeddable(FIRST_VIS_TITLE);
          await dashboard.clonePanel(FIRST_VIS_TITLE);
          await dashboard.saveDashboard(DASHBOARD_TITLE);
          await dashboard.waitForRenderComplete();

          // Text visibility is off by default, so neither panel shows annotation text yet.
          await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(0);

          // Saving a brand-new dashboard leaves it in edit mode already (no "Edit" button to
          // click), unlike opening a previously-saved one.
          await dashboard.ensureEditMode();
          await dashboard.clickPanelAction('embeddablePanelAction-editPanel', FIRST_VIS_TITLE);
          await expect(lens.inlineEditor).toBeVisible();

          // Unlike the standalone editor, the inline flyout mounts a fresh Lens editor frame
          // asynchronously, so the layer tabs may not exist yet; `activateLayerTab` polls for
          // them rather than assuming a snapshot read is already settled.
          await lens.activateLayerTab(1);
          await lens.openDimensionEditor('lnsXY_xAnnotationsPanel > lns-dimensionTrigger', 1);
          await lens.setAnnotationTextVisibility('name');
          await lens.closeDimensionEditor();

          // "Apply and close" auto-saves the linked annotation group to the library and
          // propagates the update to the other, independently-rendered cloned panel.
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();

          await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(2);
        }
      );

      await spaceTest.step(
        'removes the annotation layer from the editor once its library group is deleted',
        async () => {
          await deleteAnnotationGroupFromLibrary(page, ANNOTATION_GROUP_TITLE);

          await visualize.goto();
          await visualize.openSavedVisualization(FIRST_VIS_TITLE, { waitFor: 'lens' });
          // Dropping the layer happens once the editor resolves the now-missing library group,
          // so poll instead of reading the count as soon as the editor renders.
          await expect.poll(() => lens.getLayerCount()).toBe(1);
        }
      );

      await spaceTest.step(
        'removes the annotation layer from the dashboard panel once its library group is deleted',
        async () => {
          await dashboard.goto();
          await dashboard.clickDashboardTitleLink(DASHBOARD_TITLE);

          await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(0);
        }
      );
    }
  );
});
