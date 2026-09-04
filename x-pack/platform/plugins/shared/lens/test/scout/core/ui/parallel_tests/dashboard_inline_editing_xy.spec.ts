/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { LensPageObjects } from '../fixtures';
import {
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  createAdHocDataViewFromLens,
  createLogstashLensEditorSuiteSetup,
  openPanelInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const XY_SPLIT_PANEL = 'lnsXY_splitDimensionPanel';

/**
 * Creates an XY histogram (average of `bytes` over `@timestamp`, broken down by `ip`)
 * starting from the current dashboard (edit mode) and returns to it.
 * Replaces FTR `lens.createAndAddLensFromDashboard`.
 */
async function createXyLensPanelFromDashboard(
  { dashboard, lens }: Pick<LensPageObjects, 'dashboard' | 'lens'>,
  page: ScoutPage,
  options?: { useAdHocDataView?: boolean }
) {
  await dashboard.addNewLensPanel();
  await lens.waitForLensApp();

  if (options?.useAdHocDataView) {
    await createAdHocDataViewFromLens(page, '*stash*');
  }

  await lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'average',
    field: 'bytes',
  });
  await lens.configureDimension({
    dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
    operation: 'date_histogram',
    field: '@timestamp',
  });
  await lens.configureDimension({
    dimension: `${XY_SPLIT_PANEL} > lns-empty-dimension`,
    operation: 'terms',
    field: 'ip',
  });

  await lens.saveAndReturn();
  await dashboard.waitForRenderComplete();
}

spaceTest.describe(
  'Lens dashboard inline editing - XY panels',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      // `lnsXYvis` saved visualization for the by-reference test.
      loadLensArchives: true,
      // Dashboard-panel chart assertions read the Elastic Charts debug state.
      enableChartDebug: true,
      // Every test starts from Visualize or a dashboard, not an empty Lens editor.
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);
    spaceTest.beforeEach(suiteSetup.beforeEach);
    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('applies inline edits to a by-reference panel', async ({ pageObjects }) => {
      const { dashboard, lens, visualize } = pageObjects;

      await spaceTest.step(
        'add the saved visualization to a new dashboard and link it to the library',
        async () => {
          await visualize.goto();
          await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.XY_VIS, {
            waitFor: 'lens',
          });
          // Re-saving a saved visualization enables the add-to-dashboard radios only after
          // "Save as new visualization" is checked; `saveToLibrary: false` keeps it by-value.
          await lens.save('xyVisChart Copy', {
            addToDashboard: 'new',
            saveAsNew: true,
            saveToLibrary: false,
          });
          await dashboard.waitForRenderComplete();
          await dashboard.saveToLibrary('My by reference visualization');
        }
      );

      await spaceTest.step('remove the breakdown dimension inline and apply', async () => {
        await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

        await lens.workspace.removeAllDimensions(XY_SPLIT_PANEL);
        await applyLensInlineEditorAndWaitClosed({ lens });
        await dashboard.waitForRenderComplete();
      });

      await spaceTest.step('the panel renders a single y-axis series', async () => {
        const debugState = await lens.workspace.getDashboardChartDebugState('xyVisChart');
        expect(debugState.axes?.y).toHaveLength(1);
      });
    });

    spaceTest(
      'cancel discards inline edits on a panel with an ad-hoc data view',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step(
          'create an XY panel with a breakdown from the dashboard using an ad-hoc data view',
          async () => {
            await dashboard.openNewDashboard();
            await createXyLensPanelFromDashboard({ dashboard, lens }, page, {
              useAdHocDataView: true,
            });
          }
        );

        await spaceTest.step('remove the breakdown inline, then cancel', async () => {
          await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

          await lens.workspace.removeAllDimensions(XY_SPLIT_PANEL);
          await cancelLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('the panel still renders the breakdown series', async () => {
          const debugState = await lens.workspace.getDashboardChartDebugState('xyVisChart');
          expect((debugState.bars ?? []).length).toBeGreaterThan(1);
        });

        await spaceTest.step(
          'reopening the editor still shows the breakdown dimension',
          async () => {
            await openPanelInlineEditorAndWaitVisible({ dashboard, lens });
            await expect(page.testSubj.locator(XY_SPLIT_PANEL)).toBeVisible();
            await cancelLensInlineEditorAndWaitClosed({ lens });
          }
        );
      }
    );

    spaceTest(
      'cancel then apply inline edits on a panel created from the dashboard',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('create an XY panel with a breakdown from the dashboard', async () => {
          await dashboard.openNewDashboard();
          await createXyLensPanelFromDashboard({ dashboard, lens }, page);
        });

        await spaceTest.step('cancel keeps the breakdown', async () => {
          await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

          await lens.workspace.removeAllDimensions(XY_SPLIT_PANEL);
          await cancelLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();

          const debugState = await lens.workspace.getDashboardChartDebugState('xyVisChart');
          expect((debugState.bars ?? []).length).toBeGreaterThan(1);

          await openPanelInlineEditorAndWaitVisible({ dashboard, lens });
          await expect(page.testSubj.locator(XY_SPLIT_PANEL)).toBeVisible();
          await cancelLensInlineEditorAndWaitClosed({ lens });
        });

        await spaceTest.step('apply removes the breakdown', async () => {
          await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

          await lens.workspace.removeAllDimensions(XY_SPLIT_PANEL);
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();

          const debugState = await lens.workspace.getDashboardChartDebugState('xyVisChart');
          expect(debugState.bars ?? []).toHaveLength(1);
        });
      }
    );
  }
);
