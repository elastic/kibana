/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

const REFERENCE_LINE_LEFT = 'lnsXY_yReferenceLineLeftPanel';
const REFERENCE_LINE_RIGHT = 'lnsXY_yReferenceLineRightPanel';

spaceTest.describe('Lens reference lines', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'creates, styles and duplicates reference lines',
    async ({ page, pageObjects: { lens } }) => {
      await spaceTest.step(
        'disables the reference layer button when no data dimension exists',
        async () => {
          await page.testSubj.click('lnsLayerAddButton');
          await expect(page.testSubj.locator('lnsLayerAddButton-referenceLine')).toBeDisabled();
          // Close the add-layer popover before building the chart.
          await page.keyboard.press('Escape');
        }
      );

      await spaceTest.step('adds a reference layer with a static value', async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });

        await lens.createLayer('referenceLine');
        expect(await lens.getLayerCount()).toBe(2);

        await lens.activateLayerTab(1);
        // The default static value is backend-computed; assert the structure, not the number.
        expect(await lens.getDimensionTriggerText(REFERENCE_LINE_LEFT)).toMatch(/^Static value: /);
      });

      await spaceTest.step(
        'creates a dynamic reference line when dragging a field onto it',
        async () => {
          await lens.dragFieldToDimensionTrigger(
            'bytes',
            `${REFERENCE_LINE_LEFT} > lns-empty-dimension`
          );

          const triggers = await lens.getDimensionTriggersTexts(REFERENCE_LINE_LEFT);
          expect(triggers).toHaveLength(2);
          expect(triggers[0]).toMatch(/^Static value: /);
          expect(triggers[1]).toBe('Median of bytes');
        }
      );

      await spaceTest.step('adds a right-axis group when a right axis is enabled', async () => {
        await lens.activateLayerTab(0);
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
          keepOpen: true,
        });
        await lens.changeAxisSide('right');
        await lens.closeDimensionEditor();

        await lens.activateLayerTab(1);
        await expect(
          page.testSubj.locator(`${REFERENCE_LINE_RIGHT} > lns-empty-dimension`)
        ).toBeVisible();
      });

      await spaceTest.step(
        'carries the style when moving a reference line to another group',
        async () => {
          await lens.openDimensionEditor(`${REFERENCE_LINE_LEFT} > lns-dimensionTrigger`, 1);
          await lens.setReferenceLineFillBelow();
          // Snapshot before close: closing the editor (and applying the fill) must produce a
          // newer chart render. Settling on the pre-edit count lets the drag land on stale
          // state and drop the dimension without adding it to the target group.
          const renderCountBeforeClose = await lens.getVisualizationRenderCount('xyVisChart');
          await lens.closeDimensionEditor();
          await lens.waitForVisualization('xyVisChart', {
            afterCount: renderCountBeforeClose ?? undefined,
          });

          await lens.dragDimensionToDimension({
            from: `${REFERENCE_LINE_LEFT} > lns-dimensionTrigger`,
            to: `${REFERENCE_LINE_RIGHT} > lns-empty-dimension`,
          });
          // Moving a dimension between groups re-renders the layer panel independently of
          // the chart; wait for the trigger to actually land in its new group (rather than
          // the chart's render count, which settles separately) before interacting again.
          await expect(
            page.testSubj.locator(`${REFERENCE_LINE_LEFT} > lns-dimensionTrigger`)
          ).toHaveCount(1);
          await expect(
            page.testSubj.locator(`${REFERENCE_LINE_RIGHT} > lns-dimensionTrigger`)
          ).toHaveCount(1);
          await lens.waitForVisualization('xyVisChart');

          await lens.openDimensionEditor(`${REFERENCE_LINE_RIGHT} > lns-dimensionTrigger`, 1);
          await expect(lens.referenceLineFillBelowButton).toHaveAttribute('aria-pressed', 'true');
          await lens.closeDimensionEditor();
        }
      );

      await spaceTest.step(
        'duplicates the original style when duplicating a reference line',
        async () => {
          await lens.dragDimensionToDimension({
            from: `${REFERENCE_LINE_RIGHT} > lns-dimensionTrigger`,
            to: `${REFERENCE_LINE_RIGHT} > lns-empty-dimension`,
          });
          await expect(
            page.testSubj.locator(`${REFERENCE_LINE_RIGHT} > lns-dimensionTrigger`)
          ).toHaveCount(2);
          await lens.waitForVisualization('xyVisChart');

          await lens.openDimensionEditor(`${REFERENCE_LINE_RIGHT} > lns-dimensionTrigger`, 1, 1);
          await expect(lens.referenceLineFillBelowButton).toHaveAttribute('aria-pressed', 'true');
          await lens.closeDimensionEditor();
        }
      );
    }
  );
});
