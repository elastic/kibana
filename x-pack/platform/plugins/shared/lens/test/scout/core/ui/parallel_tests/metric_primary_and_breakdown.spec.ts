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
const BREAKDOWN_PANEL = 'lnsMetric_breakdownByDimensionPanel';
const MAX_PANEL = 'lnsMetric_maxDimensionPanel';

// Comfortably above the largest "Average of bytes" tile so the progress bar has room to fill.
const STATIC_MAX_VALUE = '100000';

const DEFAULT_TILE_COLOR = 'rgba(255, 255, 255, 1)';
// Static/dynamic fill colors are a rendering property of the color editor, not a
// backend-computed value, so exact colors are kept.
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

spaceTest.describe('Lens metric primary and breakdown', { tag: '@local-stateful-classic' }, () => {
  // Each step builds on the previous one within a single Metric chart, created in the first step.
  const suiteSetup = createLogstashLensEditorSuiteSetup({ skipEmptyLensOpen: true });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

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

        // The trendline needs its own data fetch, which lands a render pass after the one
        // `waitForVisualization` settles, so poll rather than reading the debug state once.
        await expect
          .poll(async () => {
            const [datum] = await lens.getMetricVisualizationData();
            return datum?.showingTrendline;
          })
          .toBe(true);
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
        await expect(lens.metricTilesLocator).toHaveCount(6);

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

        // Lens seeds the max dimension's static value from the active data and falls back to 0
        // when that data has not arrived yet; a zero max renders no progress bar at all. Set the
        // value explicitly, the same way metric_progress_bar_lens_editor.spec.ts does.
        const staticValueInput = page.testSubj.locator('lns-indexPattern-static_value-input');
        await expect(staticValueInput).toBeVisible();
        await staticValueInput.fill(STATIC_MAX_VALUE);
        await page.keyboard.press('Tab');

        await lens.waitForVisualization('mtrVis');
        // The progress bar lands in a render pass after the one `waitForVisualization` settles
        // on, so wait for it directly (auto-retries) rather than racing a one-shot data snapshot.
        await expect(lens.metricProgressBar).not.toHaveCount(0);

        const [datum] = await lens.getMetricVisualizationData();
        expect(datum.showingBar).toBe(true);

        await lens.closeDimensionEditor();
        await lens.removeAllDimensions(MAX_PANEL);
      });

      await spaceTest.step('re-enables the trendline together with the breakdown', async () => {
        // Trendlines are fetched separately from the tiles, so they appear (and disappear) in a
        // render pass after the one `waitForVisualization` settles on: poll for both toggles.
        const someTileShowsTrendline = async () =>
          (await lens.getMetricVisualizationData()).some(
            ({ showingTrendline }) => showingTrendline
          );

        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_line');
        await expect.poll(someTileShowsTrendline).toBe(true);
        await lens.closeDimensionEditor();

        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await page.testSubj.click('lnsMetric_background_chart_none');
        await expect.poll(someTileShowsTrendline).toBe(false);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('filters by clicking a metric tile', async () => {
        expect(await filterBar.getFilterCount()).toBe(0);

        // Click whichever IP the top-terms query returned first, rather than pinning one.
        const [firstTile] = await lens.getMetricVisualizationData();
        const title = firstTile.title ?? '';
        expect(title).toMatch(IP_TITLE);
        await lens.clickMetricTileByTitle(title);
        // Filtering to a single IP collapses the breakdown to that one term (no "Other" bucket).
        await expect(lens.metricTilesLocator).toHaveCount(1);

        await expect.poll(() => filterBar.getFiltersLabel()).toStrictEqual([`ip: ${title}`]);

        await filterBar.removeAllFilters();
        await lens.waitForVisualization('mtrVis');
        // Removing the filter re-issues the query; `waitForVisualization` can settle on a
        // transient render before the full result set arrives, so also wait for the tile count
        // to be fully restored before reading tile data below.
        await expect(lens.metricTilesLocator).toHaveCount(6);
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

        // The 3-color palette renders 4 range inputs: the "No min"/"No max" boundaries, which
        // hold no value, plus the 2 editable thresholds asserted below.
        const stops = await lens.getPaletteColorStops(4);
        const thresholds = stops.map(({ stop }) => stop).filter((stop) => Boolean(stop));
        expect(thresholds).toStrictEqual(['10400.18', '15077.59']);

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

        // The tile list keeps growing for several render passes after `waitForVisualization`
        // settles, and it only becomes tall enough to scroll once every bucket has a tile.
        // Snapshotting a partially rendered list makes `scrollIntoViewIfNeeded` a no-op, so
        // retry the whole scroll instead and assert the last tile moved up.
        await expect
          .poll(async () => {
            const tiles = await lens.getMetricTiles();
            const lastTile = tiles[tiles.length - 1];
            if (!lastTile) {
              return 0;
            }

            const initialBox = await lastTile.boundingBox();
            await lastTile.scrollIntoViewIfNeeded();
            const scrolledBox = await lastTile.boundingBox();
            if (!initialBox || !scrolledBox) {
              return 0;
            }

            return scrolledBox.y - initialBox.y;
          })
          .toBeLessThan(0);
      });

      await spaceTest.step("doesn't error with an empty formula", async () => {
        // The previous step leaves a max-cols=1 date-histogram grid that keeps the
        // workspace layout thrashing; collapse it before opening the formula editor
        // so the Formula tab click isn't racing ongoing reflows.
        await lens.removeAllDimensions(BREAKDOWN_PANEL);
        await lens.waitForVisualization('mtrVis');

        await lens.openDimensionEditor(`${PRIMARY_PANEL} > lns-dimensionTrigger`);
        await lens.switchToFormula();
        await lens.typeInFormula('', { replace: true });
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
