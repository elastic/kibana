/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKbnPalettes, KbnPalette } from '@kbn/palettes';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
const defaultPalette = palettes.get(KbnPalette.Default);
const classicPalette = palettes.get(KbnPalette.ElasticClassic);

spaceTest.describe('Lens palette and color mapping', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    enableChartDebug: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest('picks a legacy palette on an XY split dimension', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: 'geo.src',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
      operation: 'terms',
      field: '@message.raw',
      palette: { mode: 'legacy', id: 'negative' },
      keepOpen: true,
    });

    expect(await lens.style.getSelectedPaletteId(true)).toBe('negative');
    await lens.closeDimensionEditor();
  });

  spaceTest(
    'picks a color-mapping palette and carries it across pie and bar',
    async ({ pageObjects }) => {
      spaceTest.setTimeout(120_000);
      const { lens } = pageObjects;

      await spaceTest.step('configure XY with color-mapping palette', async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: '@message.raw',
          palette: { mode: 'colorMapping', id: KbnPalette.ElasticClassic },
          keepOpen: true,
        });
        expect(await lens.style.getSelectedPaletteId(false)).toBe(KbnPalette.ElasticClassic);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('carry palette to pie', async () => {
        await lens.switchToVisualization('pie');
        await lens.dimensions.openDimensionEditor(
          'lnsPie_sliceByDimensionPanel > lns-dimensionTrigger'
        );
        expect(await lens.style.getSelectedPaletteId(false)).toBe(KbnPalette.ElasticClassic);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('carry palette back to bar', async () => {
        await lens.switchToVisualization('bar');
        await lens.dimensions.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        expect(await lens.style.getSelectedPaletteId(false)).toBe(KbnPalette.ElasticClassic);
        await lens.closeDimensionEditor();
      });
    }
  );

  spaceTest(
    'renders legend colors from color mapping and categorical overrides',
    async ({ pageObjects }) => {
      spaceTest.setTimeout(120_000);
      const { lens } = pageObjects;

      await spaceTest.step('default classic mapping on legend', async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'extension.raw',
          palette: { mode: 'colorMapping', id: classicPalette.id },
          keepOpen: true,
        });
        await lens.closeDimensionEditor();

        const chart = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        const legendColors = chart.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
        expect(legendColors).toStrictEqual(
          classicPalette
            .colors()
            .slice(0, 5)
            .map((c) => c.toLowerCase())
        );
      });

      await spaceTest.step('switch color-mapping palette', async () => {
        await lens.style.changeColorMappingPalette(
          'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
          defaultPalette.id
        );
        const chart = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        const legendColors = chart.legend?.items?.map((item) => item.color.toLowerCase()) ?? [];
        expect(legendColors).toStrictEqual(
          defaultPalette
            .colors()
            .slice(0, 5)
            .map((c) => c.toLowerCase())
        );
      });

      await spaceTest.step('override first categorical color', async () => {
        await lens.style.changeColorMappingCategoricalColors(
          'lnsXY_splitDimensionPanel > lnsLayerPanel-dimensionLink',
          0,
          3
        );
        const chart = await lens.workspace.getCurrentChartDebugState('xyVisChart');
        const firstLegendItemColor = chart.legend?.items?.[0]?.color?.toLowerCase() ?? 'NONE';
        expect(firstLegendItemColor).toBe(defaultPalette.colors()[3].toLowerCase());
      });
    }
  );
});
