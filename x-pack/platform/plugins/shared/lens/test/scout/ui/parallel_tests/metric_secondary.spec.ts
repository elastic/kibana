/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  buildMetricVisualization,
  createLogstashLensEditorSuiteSetup,
  spaceTest,
} from '../fixtures';

const PRIMARY_PANEL = 'lnsMetric_primaryMetricDimensionPanel';
const SECONDARY_PANEL = 'lnsMetric_secondaryMetricDimensionPanel';
const BREAKDOWN_PANEL = 'lnsMetric_breakdownByDimensionPanel';

// The static badge color is a user-chosen, verbatim-rendered value, so the exact color is kept.
const CUSTOM_STATIC_COLOR_HEX = '#EE72A6';
const CUSTOM_STATIC_COLOR_RGB = 'rgb(238, 114, 166)';
// Trend badge numeric values are backend-computed aggregations; assert their shape/sign
// rather than the exact figure, matching legacy_metric.spec.ts.
const TREND_VALUE_WITH_ARROW = /^[+-]?[\d,]+(\.\d+)?\n[↑↓]$/;
const TREND_VALUE_ONLY = /^[+-]?[\d,]+(\.\d+)?$/;

spaceTest.describe('Lens metric secondary', { tag: '@local-stateful-classic' }, () => {
  // Each test builds its own metric below, so don't open an empty editor first.
  const suiteSetup = createLogstashLensEditorSuiteSetup({ skipEmptyLensOpen: true });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  // Each test builds its own primary+secondary "average of bytes" metric from scratch,
  // mirroring the FTR suite's per-`it` re-open of a fresh saved chart (no shared state
  // across tests), which also keeps these tests parallel-safe.
  spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
    await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
    await buildMetricVisualization(pageObjects);
  });

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'shows a badge for the secondary metric and caches static/dynamic configuration',
    async ({ page, pageObjects: { lens } }) => {
      await lens.openDimensionEditor(`${SECONDARY_PANEL} > lns-dimensionTrigger`);
      // Coloring defaults to "None", so the secondary value renders without a trend badge.
      await expect(lens.secondaryMetricBadge).toHaveCount(0);

      await spaceTest.step('configures a static badge color', async () => {
        await page.testSubj.click('lnsMetric_color_mode_static');

        await lens.setColorPickerValue(CUSTOM_STATIC_COLOR_HEX);

        await expect(lens.secondaryMetricBadge).toHaveCSS(
          'background-color',
          CUSTOM_STATIC_COLOR_RGB
        );
      });

      // Each click re-renders the badge asynchronously, so poll for the new text instead of
      // reading it once right after the click.
      await spaceTest.step(
        'switches to dynamic coloring with icon/value trend display',
        async () => {
          await page.testSubj.click('lnsMetric_color_mode_dynamic');
          await expect
            .poll(() => lens.getSecondaryMetricBadgeText())
            .toMatch(TREND_VALUE_WITH_ARROW);

          await page.testSubj.click('lnsMetric_secondary_trend_display_icon');
          await expect.poll(() => lens.getSecondaryMetricBadgeText()).toBe('↑');

          await page.testSubj.click('lnsMetric_secondary_trend_display_value');
          await expect.poll(() => lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_ONLY);
        }
      );

      await spaceTest.step(
        'compares the secondary metric to the primary metric baseline',
        async () => {
          await page.testSubj.click('lnsMetric_secondary_trend_baseline_primary');
          // Primary and secondary are both "Average of bytes", so the diff is deterministically 0
          // regardless of the underlying data.
          await expect.poll(() => lens.getSecondaryMetricBadgeText()).toBe('0');
        }
      );

      await spaceTest.step('caches the static and dynamic coloring configuration', async () => {
        await page.testSubj.click('lnsMetric_color_mode_none');

        await page.testSubj.click('lnsMetric_color_mode_static');
        await expect(lens.secondaryMetricBadge).toHaveCSS(
          'background-color',
          CUSTOM_STATIC_COLOR_RGB
        );

        await page.testSubj.click('lnsMetric_color_mode_dynamic');
        await expect.poll(() => lens.getSecondaryMetricBadgeText()).toBe('0');
      });
    }
  );

  spaceTest(
    'disables collapse-by aggregation when the primary metric is not numeric',
    async ({ page, pageObjects: { lens } }) => {
      // One tile per day in the 5-day range (with empty buckets included) plus the date span's
      // partial boundary buckets. Excludes the 2 grid filler cells Elastic Charts pads the last
      // row with (see `metricTilesLocator`'s `:not([role="presentation"])`).
      const N_TILES = 37;

      await spaceTest.step('breaks down by date histogram, including empty buckets', async () => {
        await lens.configureDimension({
          dimension: `${BREAKDOWN_PANEL} > lns-empty-dimension`,
          operation: 'date_histogram',
          field: '@timestamp',
          keepOpen: true,
        });

        await lens.enableIncludeEmptyRows();

        await lens.waitForVisualization('mtrVis');
        await expect(lens.metricTilesLocator).toHaveCount(N_TILES);
      });

      await spaceTest.step('collapses the breakdown to a single tile', async () => {
        await page.locator('select[data-test-subj="indexPattern-collapse-by"]').selectOption('sum');
        await lens.closeDimensionEditor();

        await expect(lens.metricTilesLocator).toHaveCount(1);
      });

      await spaceTest.step(
        'restores the breakdown when the primary metric becomes non-numeric',
        async () => {
          await lens.configureDimension({
            dimension: `${PRIMARY_PANEL} > lns-dimensionTrigger`,
            operation: 'last_value',
            field: 'ip',
          });

          await expect(lens.metricTilesLocator).toHaveCount(N_TILES);
        }
      );
    }
  );

  spaceTest(
    'replaces the secondary metric label and badge when the primary metric becomes non-numeric',
    async ({ page, pageObjects: { lens } }) => {
      await lens.configureDimension({
        dimension: `${PRIMARY_PANEL} > lns-dimensionTrigger`,
        operation: 'count',
        // Lens renders the "Records" pseudo-field capitalized; Scout's combo box helper
        // matches the option label verbatim (FTR's was case-insensitive).
        field: 'Records',
      });

      await spaceTest.step('shows the difference against the primary metric', async () => {
        await lens.openDimensionEditor(`${SECONDARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_color_mode_dynamic');
        await page.testSubj.click('lnsMetric_secondary_trend_baseline_primary');

        await expect.poll(() => lens.getSecondaryMetricLabel()).toBe('Difference');
        await expect.poll(() => lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_WITH_ARROW);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step(
        'falls back to a static baseline once the primary metric is non-numeric',
        async () => {
          await lens.configureDimension({
            dimension: `${PRIMARY_PANEL} > lns-dimensionTrigger`,
            operation: 'last_value',
            field: 'ip',
            isPreviousIncompatible: true,
          });

          // Lens reactively swaps the secondary metric's trend config once the primary metric
          // becomes non-numeric; that happens independently of the chart's own re-render, so poll
          // for it rather than assuming it's already settled once `configureDimension` resolves.
          await expect.poll(() => lens.getSecondaryMetricLabel()).toContain('Average of bytes');
          await expect
            .poll(() => lens.getSecondaryMetricBadgeText())
            .toMatch(TREND_VALUE_WITH_ARROW);

          await lens.openDimensionEditor(`${SECONDARY_PANEL} > lns-dimensionTrigger`);
          await expect(
            page.testSubj.locator('lnsMetric_secondary_trend_baseline_static')
          ).toBeEnabled();
          await expect(
            page.testSubj.locator('lnsMetric_secondary_trend_baseline_primary')
          ).toBeDisabled();
          await expect(
            page.testSubj.locator('lnsMetric_secondary_trend_baseline_input')
          ).toBeVisible();
        }
      );
    }
  );
});
