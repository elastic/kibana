/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  cleanupLogstashDataView,
  deleteAnnotationGroupFromLibrary,
  setupLogstashDataView,
} from '../../fixtures';

const ANNOTATION_GROUP_TITLE = 'library annotation group';
const FIRST_VIS_TITLE = 'first visualization';
const SECOND_VIS_TITLE = 'second visualization';
const DASHBOARD_TITLE = 'annotation sync test dashboard';

spaceTest.describe('Lens annotation library', { tag: tags.stateful.classic }, () => {
  let storedDataViewId: string | undefined;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    storedDataViewId = await setupLogstashDataView(
      { scoutSpace, apiServices },
      'scout-annotation-library-dv'
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupLogstashDataView({ scoutSpace, apiServices }, storedDataViewId);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'saves an annotation group to the library, syncs edits across dashboard panels, and propagates deletion',
    async ({ page, pageObjects: { visualize, lens, dashboard, saveModal } }) => {
      await spaceTest.step(
        'saves a new annotation layer to the library under a new tag',
        async () => {
          await visualize.goto();
          await visualize.openNewVisualizationWizard();
          await visualize.clickVisType('lens');
          await lens.dragFieldToWorkspace('@timestamp');
          await lens.waitForVisualization('xyVisChart');

          await lens.createLayer('annotations');
          await lens.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

          await expect(saveModal.modal).toBeVisible();
          await saveModal.fillTitle(ANNOTATION_GROUP_TITLE);
          await saveModal.fillDescription('my description');
          await saveModal.createAndSelectTag({ name: 'my-new-tag', color: '#FFCC33' });
          await saveModal.confirm();

          // Confirms this specifically saved a library-linked annotation group (as opposed to
          // a plain save), which the rest of this test depends on.
          await expect(page.getByText('View or manage in the annotation library.')).toBeVisible();

          await lens.save(FIRST_VIS_TITLE, { addToDashboard: 'none' });
        }
      );

      await spaceTest.step(
        'adds the saved annotation group from the library to a new chart',
        async () => {
          await visualize.goto();
          await visualize.openNewVisualizationWizard();
          await visualize.clickVisType('lens');
          await lens.dragFieldToWorkspace('@timestamp');
          await lens.waitForVisualization('xyVisChart');

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
          await expect(lens.getInlineEditor()).toBeVisible();

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
          await visualize.openSavedLensVisualization(FIRST_VIS_TITLE);
          expect(await lens.getLayerCount()).toBe(1);
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
