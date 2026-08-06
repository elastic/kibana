/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest, testData } from '../../fixtures';

const ANNOTATIONS_PANEL = 'lnsXY_xAnnotationsPanel';

spaceTest.describe('Lens XY annotation layers', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'adds, edits and duplicates manual and query-based annotations',
    async ({ page, pageObjects: { lens } }) => {
      await spaceTest.step(
        'disables the annotations layer button when the data layer has no date histogram',
        async () => {
          await lens.dragFieldToWorkspace('geo.src', testData.XY_CHART);

          await page.testSubj.click('lnsLayerAddButton');
          const annotationsLayerButton = page.testSubj.locator('lnsLayerAddButton-annotations');
          await expect(annotationsLayerButton).toBeDisabled();
          // Close the add-layer popover before rebuilding the chart, so it can't swallow the
          // clicks the next step makes underneath it.
          await page.keyboard.press('Escape');
          await expect(annotationsLayerButton).toBeHidden();
        }
      );

      await spaceTest.step(
        'adds a manual annotation layer with a static date and shows its text label',
        async () => {
          await lens.removeLayer();
          await lens.dragFieldToWorkspace('@timestamp', testData.XY_CHART);

          await lens.createLayer('annotations');
          expect(await lens.getLayerCount()).toBe(2);

          await lens.ensureLayerTabIsActive(1);
          await expect(lens.getDimensionTriggersLocator(ANNOTATIONS_PANEL)).toHaveText('Event');

          await lens.openDimensionEditor(`${ANNOTATIONS_PANEL} > lns-dimensionTrigger`, 1);
          await lens.setAnnotationTextVisibility('name');
          await lens.closeDimensionEditor();

          await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();
          await expect(page.testSubj.locator('xyVisAnnotationText')).toBeVisible();
        }
      );

      await spaceTest.step(
        'duplicates the style when duplicating an annotation and groups them in the chart',
        async () => {
          await lens.dragDimensionToDimension({
            from: `${ANNOTATIONS_PANEL} > lns-dimensionTrigger`,
            to: `${ANNOTATIONS_PANEL} > lns-empty-dimension`,
          });

          await lens.openDimensionEditor(`${ANNOTATIONS_PANEL} > lns-dimensionTrigger`, 1, 1);
          await expect(page.testSubj.locator('lnsXY_textVisibility_name')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
          await lens.closeDimensionEditor();

          // Duplicating copies the exact same static date, so the two annotations land on the
          // same point and render as a single grouped icon.
          await expect(page.testSubj.locator('xyVisGroupedAnnotationIcon')).toHaveCount(1);
        }
      );

      await spaceTest.step('adds a query-based annotation layer and configures it', async () => {
        await lens.removeLayer(1);
        expect(await lens.getLayerCount()).toBe(1);

        await lens.createLayer('annotations');
        expect(await lens.getLayerCount()).toBe(2);

        await lens.ensureLayerTabIsActive(1);
        await expect(lens.getDimensionTriggersLocator(ANNOTATIONS_PANEL)).toHaveText('Event');

        await lens.openDimensionEditor(`${ANNOTATIONS_PANEL} > lns-dimensionTrigger`, 1);
        await page.testSubj.click('lnsXY_annotation_query');
        await lens.configureQueryAnnotation({
          queryString: '*',
          timeField: 'utc_time',
          textDecoration: { type: 'name' },
          extraFields: ['clientip'],
        });
        await lens.closeDimensionEditor();

        // The `*` query matches every document in range, so multiple date buckets end up with
        // 2+ overlapping annotations (each its own grouped icon); just confirm at least one
        // rendered rather than asserting an exact, data-dependent count.
        await expect(page.testSubj.locator('xyVisGroupedAnnotationIcon')).not.toHaveCount(0);
      });
    }
  );
});
