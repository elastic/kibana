/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

spaceTest.describe('Lens heatmap palette', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    enableChartDebug: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  // One spaceTest with steps (not separate cases): palette/range assertions build on prior
  // stop edits in the same flyout — same sequential state as FTR heatmap.ts.
  // Exact legend stop keys/colors → #280444; UI asserts edits change chart state.
  spaceTest(
    'edits temperature palette stops, range types, and axis rotation',
    async ({ page, pageObjects }) => {
      const { lens } = pageObjects;

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
        keepOpen: true,
      });
      await lens.setTermsNumberOfValues(5);
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.waitForVisualization('xyVisChart');

      const getHeatmapDebug = () => lens.getCurrentChartDebugState('heatmapChart');

      let previousFirstLegendKey = '';
      let previousFirstLegendColor = '';

      await spaceTest.step('render heatmap with temperature palette', async () => {
        await lens.switchToVisualization('heatmap', { search: 'heat' });
        const debugState = await getHeatmapDebug();

        expect(debugState.axes?.x[0].labels?.length).toBeGreaterThan(3);
        expect(debugState.heatmap?.cells?.length).toBeGreaterThan(0);
        expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        expect(debugState.axes?.x[0].rotation).toBe(0);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
        previousFirstLegendColor = debugState.legend?.items[0]?.color ?? '';
        expect(previousFirstLegendKey).not.toBe('');
        expect(previousFirstLegendColor).not.toBe('');
      });

      await spaceTest.step('reflect stop color changes on the chart', async () => {
        await lens.openDimensionEditor('lnsHeatmap_cellPanel > lns-dimensionTrigger');
        await lens.openPalettePanelFlyout();
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="lns-palettePanelFlyout"]'],
        });
        expect(violations).toHaveLength(0);
        await lens.setInputValue('lnsPalettePanel_dynamicColoring_range_value_0', '10');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend?.items[0]?.key;
          })
          .not.toBe(previousFirstLegendKey);
        const debugState = await getHeatmapDebug();
        expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
      });

      await spaceTest.step('keep legend when switching percentage to number', async () => {
        await lens.setPaletteRangeType('number');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend?.items[0]?.key;
          })
          .not.toBe(previousFirstLegendKey);
        const debugState = await getHeatmapDebug();
        expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
      });

      await spaceTest.step('reflect stop changes in number mode', async () => {
        await lens.setInputValue('lnsPalettePanel_dynamicColoring_range_value_0', '0');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend?.items[0]?.key;
          })
          .not.toBe(previousFirstLegendKey);
        const debugState = await getHeatmapDebug();
        expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
      });

      await spaceTest.step('apply stop value without clearing cell fills', async () => {
        // Target a stop near the lower data bound; assert cells keep a fill color.
        await lens.setInputValue('lnsPalettePanel_dynamicColoring_range_value_0', '5722.7747');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend?.items[0]?.key;
          })
          .not.toBe(previousFirstLegendKey);
        const debugState = await getHeatmapDebug();
        const cells = debugState.heatmap?.cells ?? [];
        expect(cells.length).toBeGreaterThan(0);
        expect(cells[cells.length - 1]?.fill).toMatch(/^rgba?\(/);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
        previousFirstLegendColor = debugState.legend?.items[0]?.color ?? '';
      });

      await spaceTest.step('reset stop numbers when changing palette', async () => {
        await lens.changePaletteTo('status');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend?.items[0]?.color;
          })
          .not.toBe(previousFirstLegendColor);
        const debugState = await getHeatmapDebug();
        expect(debugState.legend?.items?.length).toBeGreaterThan(0);
        previousFirstLegendKey = debugState.legend?.items[0]?.key ?? '';
      });

      await spaceTest.step('keep legend when switching number to percent', async () => {
        // FTR asserted the legend was byte-for-byte identical across this switch. Capture the
        // pre-switch shape (rather than hardcoding fixture-dependent literals, which are
        // descoped to #280444) so the "unchanged" intent is still enforced.
        const legendBefore = (await getHeatmapDebug()).legend?.items?.map(({ key, color }) => ({
          key,
          color,
        }));
        await lens.setPaletteRangeType('percent');

        const legendAfter = (await getHeatmapDebug()).legend?.items?.map(({ key, color }) => ({
          key,
          color,
        }));
        expect(legendAfter).toStrictEqual(legendBefore);
      });

      await spaceTest.step('change x-axis label rotation', async () => {
        await lens.closePalettePanelFlyout();
        await lens.closeDimensionEditor();
        await lens.openStyleSettingsFlyout();
        await lens.setAxisLabelOrientation('vertical');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.axes?.x[0].rotation;
          })
          .toBe(90);
      });

      // FTR also had a skipped case: axis title mode Auto → expect y-axis title
      // "Average of bytes". Not migrated — Elastic Charts was not reporting the title
      // (`it.skip` in heatmap.ts: "Skip for now as EC is not reporting title").
    }
  );
});
