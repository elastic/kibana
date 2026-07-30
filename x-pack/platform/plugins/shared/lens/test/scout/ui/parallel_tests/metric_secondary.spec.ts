/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  buildMetricVisualization,
  cleanupLogstashDataView,
  setupLogstashDataView,
} from '../fixtures';

const PRIMARY_PANEL = 'lnsMetric_primaryMetricDimensionPanel';
const SECONDARY_PANEL = 'lnsMetric_secondaryMetricDimensionPanel';
const BREAKDOWN_PANEL = 'lnsMetric_breakdownByDimensionPanel';

// The static badge color is a user-chosen, verbatim-rendered value, so the exact color is kept.
const CUSTOM_STATIC_COLOR_HEX = '#EE72A6';
const CUSTOM_STATIC_COLOR_RGB = 'rgb(238, 114, 166)';
// Trend badge numeric values are backend-computed aggregations; assert their shape/sign
// rather than the exact figure (plan §2b assertion hygiene), matching legacy_metric.spec.ts.
const TREND_VALUE_WITH_ARROW = /^[+-]?[\d,]+(\.\d+)?\n[↑↓]$/;
const TREND_VALUE_ONLY = /^[+-]?[\d,]+(\.\d+)?$/;

spaceTest.describe('Lens metric secondary', { tag: '@local-stateful-classic' }, () => {
  let storedDataViewId: string | undefined;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    storedDataViewId = await setupLogstashDataView(
      { scoutSpace, apiServices },
      'scout-metric-secondary-dv'
    );
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects: { visualize, lens } }) => {
    await browserAuth.loginAsPrivilegedUser();
    // Each test builds its own primary+secondary "average of bytes" metric from scratch,
    // mirroring the FTR suite's per-`it` re-open of a fresh saved chart (no shared state
    // across tests), which also keeps these tests parallel-safe.
    await buildMetricVisualization({ visualize, lens });
  });

  spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupLogstashDataView({ scoutSpace, apiServices }, storedDataViewId);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'shows a badge for the secondary metric and caches static/dynamic configuration',
    async ({ page, pageObjects: { lens } }) => {
      await lens.openDimensionEditor(`${SECONDARY_PANEL} > lns-dimensionTrigger`);
      expect(await lens.hasSecondaryMetricBadge()).toBe(false);

      await spaceTest.step('configures a static badge color', async () => {
        await page.testSubj.click('lnsMetric_color_mode_static');

        await lens.setColorPickerValue(CUSTOM_STATIC_COLOR_HEX);

        await expect(lens.getSecondaryMetricBadgeLocator()).toHaveCSS(
          'background-color',
          CUSTOM_STATIC_COLOR_RGB
        );
      });

      await spaceTest.step(
        'switches to dynamic coloring with icon/value trend display',
        async () => {
          await page.testSubj.click('lnsMetric_color_mode_dynamic');
          expect(await lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_WITH_ARROW);

          await page.testSubj.click('lnsMetric_secondary_trend_display_icon');
          expect(await lens.getSecondaryMetricBadgeText()).toBe('↑');

          await page.testSubj.click('lnsMetric_secondary_trend_display_value');
          expect(await lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_ONLY);
        }
      );

      await spaceTest.step(
        'compares the secondary metric to the primary metric baseline',
        async () => {
          await page.testSubj.click('lnsMetric_secondary_trend_baseline_primary');
          // Primary and secondary are both "Average of bytes", so the diff is deterministically 0
          // regardless of the underlying data.
          expect(await lens.getSecondaryMetricBadgeText()).toBe('0');
        }
      );

      await spaceTest.step('caches the static and dynamic coloring configuration', async () => {
        await page.testSubj.click('lnsMetric_color_mode_none');

        await page.testSubj.click('lnsMetric_color_mode_static');
        await expect(lens.getSecondaryMetricBadgeLocator()).toHaveCSS(
          'background-color',
          CUSTOM_STATIC_COLOR_RGB
        );

        await page.testSubj.click('lnsMetric_color_mode_dynamic');
        expect(await lens.getSecondaryMetricBadgeText()).toBe('0');
      });
    }
  );

  spaceTest(
    'disables collapse-by aggregation when the primary metric is not numeric',
    async ({ page, pageObjects: { lens } }) => {
      // One tile per day in the 5-day range (with empty buckets included) plus the date span's
      // partial boundary buckets. Excludes the 2 grid filler cells Elastic Charts pads the last
      // row with (see `getMetricTilesLocator`'s `:not([role="presentation"])`).
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
        await expect(lens.getMetricTilesLocator()).toHaveCount(N_TILES);
      });

      await spaceTest.step('collapses the breakdown to a single tile', async () => {
        await page.locator('select[data-test-subj="indexPattern-collapse-by"]').selectOption('sum');
        await lens.closeDimensionEditor();

        await expect(lens.getMetricTilesLocator()).toHaveCount(1);
      });

      await spaceTest.step(
        'restores the breakdown when the primary metric becomes non-numeric',
        async () => {
          await lens.configureDimension({
            dimension: `${PRIMARY_PANEL} > lns-dimensionTrigger`,
            operation: 'last_value',
            field: 'ip',
          });

          await expect(lens.getMetricTilesLocator()).toHaveCount(N_TILES);
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
        field: 'records',
      });

      await spaceTest.step('shows the difference against the primary metric', async () => {
        await lens.openDimensionEditor(`${SECONDARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_color_mode_dynamic');
        await page.testSubj.click('lnsMetric_secondary_trend_baseline_primary');

        expect(await lens.getSecondaryMetricLabel()).toBe('Difference');
        expect(await lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_WITH_ARROW);
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
          expect(await lens.getSecondaryMetricBadgeText()).toMatch(TREND_VALUE_WITH_ARROW);

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
