/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { getKbnPalettes, KbnPalette } from '@kbn/palettes';
import { createLogstashLensEditorSuiteSetup, spaceTest, type LensPageObjects } from '../fixtures';

const OTHER_BUCKET_RAW_NAME = '__other__';
const OTHER_BUCKET_DISPLAY_NAME = 'Other';

const DEFAULT_NEUTRAL_PALETTE_INDEX = 1;
const TERMS_COUNT = 6;
const palettes = getKbnPalettes({ name: 'borealis', darkMode: false });
const NEUTRAL_HEX = palettes
  .get(KbnPalette.Neutral)
  .getColor(DEFAULT_NEUTRAL_PALETTE_INDEX)
  .toLowerCase();

interface ChartTestCase {
  label: string;
  visualization: 'pie' | 'bar';
  visualizationSearch: string;
  extraDimensions: Array<{
    dimension: string;
    operation: string;
    field: string;
  }>;
  breakdownEmpty: string;
  breakdownTrigger: string;
  metricEmpty: string;
  chartTestSubj: 'partitionVisChart' | 'xyVisChart';
  otherSeriesName: string;
}

const charts: ChartTestCase[] = [
  {
    label: 'pie',
    visualization: 'pie',
    visualizationSearch: 'Pie',
    extraDimensions: [],
    breakdownEmpty: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
    breakdownTrigger: 'lnsPie_sliceByDimensionPanel > lns-dimensionTrigger',
    metricEmpty: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
    chartTestSubj: 'partitionVisChart',
    otherSeriesName: OTHER_BUCKET_RAW_NAME,
  },
  {
    label: 'bar',
    visualization: 'bar',
    visualizationSearch: 'Bar',
    extraDimensions: [
      {
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      },
    ],
    breakdownEmpty: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
    breakdownTrigger: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
    metricEmpty: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    chartTestSubj: 'xyVisChart',
    otherSeriesName: OTHER_BUCKET_DISPLAY_NAME,
  },
];

const readOtherBucketColor = async (ctx: {
  lens: LensPageObjects['lens'];
  chartTestSubj: ChartTestCase['chartTestSubj'];
  otherSeriesName: string;
}): Promise<string | undefined> => {
  const { lens, chartTestSubj, otherSeriesName } = ctx;

  switch (chartTestSubj) {
    case 'partitionVisChart': {
      const debug = await lens.workspace.getCurrentChartDebugState('partitionVisChart');
      const slice = debug?.partition?.[0]?.partitions?.find((s) => s.name === otherSeriesName);
      return slice?.color?.toLowerCase();
    }
    case 'xyVisChart': {
      const debug = await lens.workspace.getCurrentChartDebugState('xyVisChart');
      const bar = debug?.bars?.find((b) => b.name === otherSeriesName);
      return bar?.color?.toLowerCase();
    }
  }
};

spaceTest.describe('Lens categorical color mapping', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    enableChartDebug: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  for (const chartCase of charts) {
    spaceTest(
      `"Other" bucket on ${chartCase.label} — colors bucket by mode: neutral (default), auto, and custom color`,
      async ({ page, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.switchToVisualization(
          chartCase.visualization,
          chartCase.visualizationSearch ? { search: chartCase.visualizationSearch } : undefined
        );

        for (const extra of chartCase.extraDimensions) {
          await lens.configureDimension(extra);
        }

        await lens.configureDimension({
          dimension: chartCase.breakdownEmpty,
          operation: 'terms',
          field: 'geo.srcdest',
          keepOpen: true,
        });

        await lens.dimensions.setTermsNumberOfValues(TERMS_COUNT);
        await lens.closeDimensionEditor();

        await lens.configureDimension({
          dimension: chartCase.metricEmpty,
          operation: 'count',
          field: 'Records',
        });

        await lens.waitForVisualization(chartCase.chartTestSubj);

        const getOtherBucketColor = () =>
          readOtherBucketColor({
            lens,
            chartTestSubj: chartCase.chartTestSubj,
            otherSeriesName: chartCase.otherSeriesName,
          });

        await spaceTest.step('defaults the "Other" slice to the theme-neutral color', async () => {
          await lens.dimensions.openDimensionEditor(chartCase.breakdownTrigger);
          await lens.openPalettePanelFlyout();

          const { violations } = await page.checkA11y({
            include: ['[data-test-subj="lns-colorMapping-otherBucketConfig"]'],
          });
          expect(violations).toHaveLength(0);

          await expect(
            page.testSubj.locator('lns-colorMapping-otherBucketMode-neutral')
          ).toHaveAttribute('aria-pressed', 'true');

          await expect.poll(getOtherBucketColor).toBe(NEUTRAL_HEX);
        });

        await spaceTest.step('applies an automatic loop color when switching to Auto', async () => {
          await lens.style.setOtherBucketColorMode('none');
          await expect
            .poll(getOtherBucketColor)
            .toBe(palettes.get(KbnPalette.Default).getColor(TERMS_COUNT).toLowerCase());
        });

        await spaceTest.step('applies a custom hex when switching to Color', async () => {
          await lens.style.setOtherBucketColorMode('static');
          await lens.style.setOtherBucketCustomHex('#ff0000');
          await expect.poll(getOtherBucketColor).toBe('#ff0000');
        });
      }
    );
  }
});
