/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DebugState } from '@elastic/charts';
import { createLogstashLensEditorSuiteSetup, enableElasticChartDebug } from '../fixtures';

spaceTest.describe('Lens heatmap palette', { tag: tags.stateful.classic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    dataViewNamePrefix: 'scout-lens-heatmap-dv',
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.afterAll(suiteSetup.afterAll);

  // One spaceTest with steps (not separate cases): palette/range assertions build on prior
  // stop edits in the same flyout — same sequential state as FTR heatmap.ts.
  spaceTest(
    'edits temperature palette stops, range types, and axis rotation',
    async ({ browserAuth, context, page, pageObjects }) => {
      const { visualize, lens } = pageObjects;

      await enableElasticChartDebug(context);
      await browserAuth.loginAsPrivilegedUser();
      await visualize.goto();
      await visualize.openNewVisualizationWizard();
      await visualize.clickVisType('lens');
      await lens.waitForLensApp();

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

      const getHeatmapDebug = async (): Promise<DebugState> =>
        (await lens.getCurrentChartDebugState('heatmapChart')) as DebugState;

      await spaceTest.step('render heatmap with temperature palette', async () => {
        await lens.switchToVisualization('heatmap', { search: 'heat' });
        const debugState = await getHeatmapDebug();

        expect(debugState.axes!.x[0].labels).toStrictEqual([
          '97.220.3.248',
          '169.228.188.120',
          '78.83.247.30',
          '226.82.228.233',
          '93.28.27.24',
          'Other',
        ]);
        expect(debugState.axes!.y[0].labels).toStrictEqual(['']);
        expect(debugState.heatmap!.cells).toHaveLength(6);
        expect(debugState.legend!.items).toStrictEqual([
          { key: '5,722.775 - 8,529.22', name: '5,722.775 - 8,529.22', color: '#61a2ff' },
          { key: '8,529.22 - 11,335.665', name: '8,529.22 - 11,335.665', color: '#cfe1ff' },
          { key: '11,335.665 - 14,142.11', name: '11,335.665 - 14,142.11', color: '#f6f9fc' },
          { key: '14,142.11 - 16,948.555', name: '14,142.11 - 16,948.555', color: '#ffd4cf' },
          { key: '≥ 16,948.555', name: '≥ 16,948.555', color: '#f6726a' },
        ]);
        expect(debugState.axes!.x[0].rotation).toBe(0);
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
            return debugState.legend!.items[0]?.key;
          })
          .toBe('7,125.997 - 8,529.22');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '7,125.997 - 8,529.22', name: '7,125.997 - 8,529.22', color: '#61a2ff' },
          { key: '8,529.22 - 11,335.665', name: '8,529.22 - 11,335.665', color: '#cfe1ff' },
          { key: '11,335.665 - 14,142.11', name: '11,335.665 - 14,142.11', color: '#f6f9fc' },
          { key: '14,142.11 - 16,948.555', name: '14,142.11 - 16,948.555', color: '#ffd4cf' },
          { key: '≥ 16,948.555', name: '≥ 16,948.555', color: '#f6726a' },
        ]);
      });

      await spaceTest.step('keep legend when switching percentage to number', async () => {
        await lens.setPaletteRangeType('number');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend!.items[0]?.key;
          })
          .toBe('7,125.99 - 8,529.2');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '7,125.99 - 8,529.2', name: '7,125.99 - 8,529.2', color: '#61a2ff' },
          { key: '8,529.2 - 11,335.66', name: '8,529.2 - 11,335.66', color: '#cfe1ff' },
          { key: '11,335.66 - 14,142.1', name: '11,335.66 - 14,142.1', color: '#f6f9fc' },
          { key: '14,142.1 - 16,948.55', name: '14,142.1 - 16,948.55', color: '#ffd4cf' },
          { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#f6726a' },
        ]);
      });

      await spaceTest.step('reflect stop changes in number mode', async () => {
        await lens.setInputValue('lnsPalettePanel_dynamicColoring_range_value_0', '0');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend!.items[0]?.key;
          })
          .toBe('0 - 8,529.2');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '0 - 8,529.2', name: '0 - 8,529.2', color: '#61a2ff' },
          { key: '8,529.2 - 11,335.66', name: '8,529.2 - 11,335.66', color: '#cfe1ff' },
          { key: '11,335.66 - 14,142.1', name: '11,335.66 - 14,142.1', color: '#f6f9fc' },
          { key: '14,142.1 - 16,948.55', name: '14,142.1 - 16,948.55', color: '#ffd4cf' },
          { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#f6726a' },
        ]);
      });

      await spaceTest.step('apply stop value without rounding away cell color', async () => {
        // Target item is 5722.774804505345 — set a slightly lower value that can round.
        await lens.setInputValue('lnsPalettePanel_dynamicColoring_range_value_0', '5722.7747');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend!.items[0]?.key;
          })
          .toBe('5,722.775 - 8,529.2');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '5,722.775 - 8,529.2', name: '5,722.775 - 8,529.2', color: '#61a2ff' },
          { key: '8,529.2 - 11,335.66', name: '8,529.2 - 11,335.66', color: '#cfe1ff' },
          { key: '11,335.66 - 14,142.1', name: '11,335.66 - 14,142.1', color: '#f6f9fc' },
          { key: '14,142.1 - 16,948.55', name: '14,142.1 - 16,948.55', color: '#ffd4cf' },
          { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#f6726a' },
        ]);
        expect(debugState.heatmap!.cells[debugState.heatmap!.cells.length - 1].fill).toBe(
          'rgba(97, 162, 255, 1)'
        );
      });

      await spaceTest.step('reset stop numbers when changing palette', async () => {
        await lens.changePaletteTo('status');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend!.items[0]?.color;
          })
          .toBe('#24c292');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '5,722.775 - 8,529.22', name: '5,722.775 - 8,529.22', color: '#24c292' },
          { key: '8,529.22 - 11,335.665', name: '8,529.22 - 11,335.665', color: '#aee8d2' },
          { key: '11,335.665 - 14,142.11', name: '11,335.665 - 14,142.11', color: '#fcd883' },
          { key: '14,142.11 - 16,948.555', name: '14,142.11 - 16,948.555', color: '#ffc9c2' },
          { key: '≥ 16,948.555', name: '≥ 16,948.555', color: '#f6726a' },
        ]);
      });

      await spaceTest.step('keep legend when switching number to percent', async () => {
        await lens.setPaletteRangeType('percent');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.legend!.items[0]?.key;
          })
          .toBe('5,722.775 - 8,529.22');
        const debugState = await getHeatmapDebug();
        expect(debugState.legend!.items).toStrictEqual([
          { key: '5,722.775 - 8,529.22', name: '5,722.775 - 8,529.22', color: '#24c292' },
          { key: '8,529.22 - 11,335.665', name: '8,529.22 - 11,335.665', color: '#aee8d2' },
          { key: '11,335.665 - 14,142.11', name: '11,335.665 - 14,142.11', color: '#fcd883' },
          { key: '14,142.11 - 16,948.555', name: '14,142.11 - 16,948.555', color: '#ffc9c2' },
          { key: '≥ 16,948.555', name: '≥ 16,948.555', color: '#f6726a' },
        ]);
      });

      await spaceTest.step('change x-axis label rotation', async () => {
        await lens.closePalettePanelFlyout();
        await lens.closeDimensionEditor();
        await lens.openStyleSettings();
        await lens.setAxisLabelOrientation('vertical');
        await expect
          .poll(async () => {
            const debugState = await getHeatmapDebug();
            return debugState.axes!.x[0].rotation;
          })
          .toBe(90);
      });

      // FTR also had a skipped case: axis title mode Auto → expect y-axis title
      // "Average of bytes". Not migrated — Elastic Charts was not reporting the title
      // (`it.skip` in heatmap.ts: "Skip for now as EC is not reporting title").
    }
  );
});
