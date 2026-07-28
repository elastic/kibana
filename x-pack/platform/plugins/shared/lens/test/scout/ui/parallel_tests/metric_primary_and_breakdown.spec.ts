/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  buildMetricVisualization,
  cleanupLogstashDataView,
  setupLogstashDataView,
} from '../fixtures';

const PRIMARY_PANEL = 'lnsMetric_primaryMetricDimensionPanel';
const BREAKDOWN_PANEL = 'lnsMetric_breakdownByDimensionPanel';
const MAX_PANEL = 'lnsMetric_maxDimensionPanel';

const DEFAULT_TILE_COLOR = 'rgba(255, 255, 255, 1)';
// Static/dynamic fill colors are a rendering property of the color editor, not a
// backend-computed value, so exact colors are kept (plan §2b assertion hygiene).
const STATIC_COLOR = 'rgba(0, 0, 0, 1)';
const DYNAMIC_COLORS = [
  'rgba(246, 114, 106, 1)',
  'rgba(246, 114, 106, 1)',
  'rgba(246, 114, 106, 1)',
  'rgba(246, 114, 106, 1)',
  'rgba(246, 114, 106, 1)',
  'rgba(36, 194, 146, 1)',
];
// Breakdown tile values are backend-computed aggregations; assert their shape rather
// than the exact figure.
const NUMERIC_VALUE = /^[\d,]+(\.\d+)?$/;
const IP_TITLE = /^\d+\.\d+\.\d+\.\d+$/;

spaceTest.describe('Lens metric primary and breakdown', { tag: tags.stateful.classic }, () => {
  let storedDataViewId: string | undefined;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    storedDataViewId = await setupLogstashDataView(
      { scoutSpace, apiServices },
      'scout-metric-primary-breakdown-dv'
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
    'configures primary/secondary/breakdown metrics, trendlines, colors and formatting',
    async ({ page, pageObjects: { visualize, lens, filterBar } }) => {
      await spaceTest.step('renders a metric with a primary and secondary dimension', async () => {
        await buildMetricVisualization({ visualize, lens });
        expect(await lens.getMetricVisualizationData()).toHaveLength(1);
      });

      await spaceTest.step('enables a trendline on the primary metric', async () => {
        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_line');
        await lens.closeDimensionEditor();
        await lens.waitForVisualization('mtrVis');

        const [datum] = await lens.getMetricVisualizationData();
        expect(datum.showingTrendline).toBe(true);
      });

      await spaceTest.step('breaks down the metric by terms', async () => {
        await lens.configureDimension({
          dimension: `${BREAKDOWN_PANEL} > lns-empty-dimension`,
          operation: 'terms',
          field: 'ip',
          keepOpen: true,
        });
        await lens.setTermsNumberOfValues(5); // Default is 9
        await lens.closeDimensionEditor();
        await lens.waitForVisualization('mtrVis');
        // Number of values (5) + the "Other" bucket. `waitForVisualization` only waits for
        // rendering to settle, not for this specific tile count, so assert it explicitly first —
        // `toHaveCount` auto-retries, covering the query round-trip after the size change commits.
        await expect(lens.getMetricTilesLocator()).toHaveCount(6);

        const data = await lens.getMetricVisualizationData();
        // First 5 tiles are top IP terms, the last is the "Other" bucket (structural check;
        // the specific top-5 IPs are backend-computed and not pinned).
        for (const datum of data.slice(0, 5)) {
          expect(datum.title).toMatch(IP_TITLE);
        }
        expect(data[5].title).toBe('Other');
        for (const datum of data) {
          expect(datum.subtitle).toBe('Average of bytes');
          expect(datum.value).toMatch(NUMERIC_VALUE);
          expect(datum.color).toBe(DEFAULT_TILE_COLOR);
          expect(datum.trendlineColor).toBe(DEFAULT_TILE_COLOR);
          expect(datum.showingTrendline).toBe(true);
          expect(datum.showingBar).toBe(false);
        }

        // Turn the trendline back off before adding the "max" dimension below.
        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_none');
        await lens.closeDimensionEditor();
        await lens.waitForVisualization('mtrVis');
      });

      await spaceTest.step('enables a progress bar via the max dimension', async () => {
        await lens.openDimensionEditor(`${MAX_PANEL} > lns-empty-dimension`);
        await lens.waitForVisualization('mtrVis');
        // The progress bar lands in a render pass after the one `waitForVisualization` settles
        // on, so wait for it directly (auto-retries) rather than racing a one-shot data snapshot.
        await expect(lens.getMetricProgressBarLocator()).not.toHaveCount(0);

        const [datum] = await lens.getMetricVisualizationData();
        expect(datum.showingBar).toBe(true);

        await lens.closeDimensionEditor();
        await lens.removeAllDimensions(MAX_PANEL);
      });

      await spaceTest.step('re-enables the trendline together with the breakdown', async () => {
        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_line');
        await lens.waitForVisualization('mtrVis');

        expect(
          (await lens.getMetricVisualizationData()).some((datum) => datum.showingTrendline)
        ).toBe(true);
        await lens.closeDimensionEditor();

        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_none');
        await lens.waitForVisualization('mtrVis');

        expect(
          (await lens.getMetricVisualizationData()).some((datum) => datum.showingTrendline)
        ).toBe(false);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('filters by clicking a metric tile', async () => {
        expect(await filterBar.getFilterCount()).toBe(0);

        const title = '93.28.27.24';
        await lens.clickMetricTileByTitle(title);
        // Filtering to a single IP collapses the breakdown to that one term (no "Other" bucket).
        await expect(lens.getMetricTilesLocator()).toHaveCount(1);

        await expect.poll(() => filterBar.getFiltersLabel()).toStrictEqual([`ip: ${title}`]);

        await filterBar.removeAllFilters();
        await lens.waitForVisualization('mtrVis');
        // Removing the filter re-issues the query; `waitForVisualization` can settle on a
        // transient render before the full result set arrives, so also wait for the tile count
        // to be fully restored before reading tile data below.
        await expect(lens.getMetricTilesLocator()).toHaveCount(6);
      });

      await spaceTest.step('applies a static color to every tile', async () => {
        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);

        await lens.setColorPickerValue('#000000');
        await lens.waitForVisualization('mtrVis');

        // Tile fill color is applied on its own debounce independent of `data-rendering-count`,
        // so `waitForVisualization` alone can't be relied on to have caught up; poll for it.
        await expect
          .poll(async () => (await lens.getMetricVisualizationData()).map(({ color }) => color))
          .toStrictEqual(new Array(6).fill(STATIC_COLOR));
      });

      await spaceTest.step('applies dynamic colors based on value', async () => {
        await page.testSubj.click('lnsMetric_color_mode_dynamic');
        await lens.waitForVisualization('mtrVis');

        await expect
          .poll(async () => (await lens.getMetricVisualizationData()).map(({ color }) => color))
          .toStrictEqual(DYNAMIC_COLORS);
      });

      await spaceTest.step('converts the palette color stops to a fixed number', async () => {
        await lens.openPalettePanelFlyout();
        await page.testSubj.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');

        // The 3-color palette renders 4 range inputs (disabled "No min"/"No max" boundaries
        // plus 2 editable thresholds); omit the count so the wait is keyed only on value
        // stability, then assert on the 2 editable thresholds.
        const stops = await lens.getPaletteColorStops();
        const editableStops = stops.filter(({ stop }) => stop);
        expect(editableStops.map(({ stop }) => stop)).toStrictEqual(['10400.18', '15077.59']);

        await lens.waitForVisualization('mtrVis');
        // Colors shouldn't change just from converting the range type.
        await expect
          .poll(async () => (await lens.getMetricVisualizationData()).map(({ color }) => color))
          .toStrictEqual(DYNAMIC_COLORS);

        await lens.closePalettePanelFlyout();
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('makes the visualization scrollable when too tall', async () => {
        await lens.removeAllDimensions(BREAKDOWN_PANEL);
        await lens.configureDimension({
          dimension: `${BREAKDOWN_PANEL} > lns-empty-dimension`,
          operation: 'date_histogram',
          field: '@timestamp',
          keepOpen: true,
        });

        await lens.enableIncludeEmptyRows();

        await page.testSubj.locator('lnsMetric_max_cols').fill('1');
        await page.keyboard.press('Tab');
        await lens.waitForVisualization('mtrVis');
        await lens.closeDimensionEditor();

        const tiles = await lens.getMetricTiles();
        const lastTile = tiles[tiles.length - 1];

        const initialBox = await lastTile.boundingBox();
        await lastTile.scrollIntoViewIfNeeded();
        const scrolledBox = await lastTile.boundingBox();

        expect(initialBox).not.toBeNull();
        expect(scrolledBox).not.toBeNull();
        expect(scrolledBox!.y).toBeLessThan(initialBox!.y);
      });

      await spaceTest.step("doesn't error with an empty formula", async () => {
        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await lens.switchToFormula();
        await lens.typeFormula('');
        await lens.waitForVisualization('mtrVis');

        await expect(lens.getMessageListItems('error')).toHaveCount(0);
      });

      await spaceTest.step(
        'carries custom formatting when transitioning from another visualization',
        async () => {
          await visualize.goto();
          await visualize.openNewVisualizationWizard();
          await visualize.clickVisType('lens');
          await lens.switchToVisualization('lnsLegacyMetric');

          await lens.configureDimension({
            dimension: 'lns-empty-dimension',
            operation: 'average',
            field: 'bytes',
            keepOpen: true,
          });
          await lens.editDimensionFormat('Number', { decimals: 3, prefix: ' blah' });
          await lens.closeDimensionEditor();

          await lens.switchToVisualization('lnsMetric', { search: 'Metric' });
          await lens.waitForVisualization('mtrVis');

          // Extract the numeric decimals from the value without any compact suffix like k or m.
          const getDecimalsLength = async () => {
            const [{ value }] = await lens.getMetricVisualizationData();
            return value?.split('.')[1]?.match(/\d+/)?.[0]?.length;
          };
          // The custom format can lag one more async pass behind the visualization-switch's own
          // render-count-based stabilization (Lens reapplies persisted format params after
          // committing the new chart type), so poll for it settling rather than racing a
          // one-shot read.
          await expect.poll(getDecimalsLength).toBe(3);

          const [{ value }] = await lens.getMetricVisualizationData();
          expect(value).toContain('blah');
        }
      );
    }
  );
});
