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
} from '../fixtures';

const SECONDARY_METRIC_PANEL = 'lnsMetric_secondaryMetricDimensionPanel';

/**
 * Builds a fresh Lens Metric visualization with only a primary "Average of bytes" dimension.
 * Mirrors FTR lens group13 `createNewLens`; the specs below add the secondary dimension
 * later through the inline-editing flyout.
 */
async function buildBytesMetricVisualization({
  visualize,
  lens,
}: Pick<LensPageObjects, 'visualize' | 'lens'>) {
  await visualize.goto();
  await visualize.openNewVisualizationWizard();
  await visualize.clickVisType('lens');

  await lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'average',
    field: 'bytes',
  });
  await lens.switchToVisualization('lnsMetric', { search: 'Metric' });
  await lens.waitForVisualization('mtrVis');
}

// Baseline metric tile state produced by `buildBytesMetricVisualization` over the
// logstash fixture data; inline editing only ever changes `extraText` on top of this.
const BASE_METRIC_TILE = {
  title: 'Average of bytes',
  subtitle: undefined,
  value: '5,727.314',
  color: 'rgba(255, 255, 255, 1)',
  trendlineColor: undefined,
  showingTrendline: false,
  showingBar: false,
};

spaceTest.describe(
  'Lens dashboard inline editing - metric panels',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      // Every test starts from Visualize, not an empty Lens editor.
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);
    spaceTest.beforeEach(suiteSetup.beforeEach);
    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest('applies inline edits to a by-value panel', async ({ page, pageObjects }) => {
      const { dashboard, lens, visualize } = pageObjects;
      // Unsaved-changes dot on the Save split button (same subject FTR's
      // `ensureHasUnsavedChangesNotification` used); `dashboardUnsavedChangesBadge`
      // only exists on new, never-saved dashboards.
      const unsavedChangesIndicator = page.testSubj.locator('split-button-notification-indicator');

      await spaceTest.step('create a metric panel on a new saved dashboard', async () => {
        await buildBytesMetricVisualization({ visualize, lens });
        // `saveToLibrary: false` (FTR parity): the modal's "Add to library"
        // checkbox defaults to checked, which would leak a library saved object
        // into the shared worker space — these tests exercise by-value panels.
        await lens.save('New Lens from Modal', { addToDashboard: 'new', saveToLibrary: false });
        await dashboard.waitForRenderComplete();
        await dashboard.saveDashboard('My InlineEditing Dashboard');
      });

      await spaceTest.step('add a secondary dimension in the inline editor', async () => {
        await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

        await lens.configureDimension({
          dimension: `${SECONDARY_METRIC_PANEL} > lns-empty-dimension`,
          operation: 'max',
          field: 'bytes',
        });
        // Editing inside the flyout must not flag dashboard changes until applied.
        await expect(unsavedChangesIndicator).toBeHidden();
      });

      await spaceTest.step('apply and verify the dashboard picks up the change', async () => {
        await applyLensInlineEditorAndWaitClosed({ lens });
        await expect(unsavedChangesIndicator).toBeVisible();
        await dashboard.waitForRenderComplete();

        const [metricTile] = await lens.metric.getMetricVisualizationData();
        expect({
          ...metricTile,
          extraText: metricTile.extraText?.replace(/\n/g, ' '),
        }).toStrictEqual({
          ...BASE_METRIC_TILE,
          extraText: '19,986',
        });
      });
    });

    spaceTest('cancel discards inline edits on a by-value panel', async ({ pageObjects }) => {
      const { dashboard, lens, visualize } = pageObjects;

      await spaceTest.step('create a metric panel on a new dashboard', async () => {
        await buildBytesMetricVisualization({ visualize, lens });
        // `saveToLibrary: false` — see the comment on the first save above.
        await lens.save('New Lens from Modal', { addToDashboard: 'new', saveToLibrary: false });
        await dashboard.waitForRenderComplete();
      });

      await spaceTest.step('add a secondary dimension inline, then cancel', async () => {
        await openPanelInlineEditorAndWaitVisible({ dashboard, lens });

        await lens.configureDimension({
          dimension: `${SECONDARY_METRIC_PANEL} > lns-empty-dimension`,
          operation: 'max',
          field: 'bytes',
        });
        await cancelLensInlineEditorAndWaitClosed({ lens });
        await dashboard.waitForRenderComplete();
      });

      await spaceTest.step('the metric tile is unchanged', async () => {
        const [metricTile] = await lens.metric.getMetricVisualizationData();
        expect(metricTile).toStrictEqual({ ...BASE_METRIC_TILE, extraText: '' });
      });
    });
  }
);
