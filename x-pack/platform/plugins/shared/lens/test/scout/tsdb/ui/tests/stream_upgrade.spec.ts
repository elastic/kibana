/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  TSDB_SCENARIO_DOCUMENT_COUNT,
  createTsdbScenarioTimeRange,
  createTsdbStreamScenario,
  enableElasticChartDebug,
  sumFirstNValues,
  test,
} from '../fixtures';
import type { TsdbScenarioContext, TsdbScenarioIndex } from '../fixtures';

const RESOURCE_SUFFIX = `${process.pid}-${Date.now()}`;
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_upgrade_${RESOURCE_SUFFIX}`;
const REGULAR_INDEX = `kibana_sample_data_lens_tsdb_regular_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_tsdb_additional_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

const SCENARIOS: Array<{ title: string; indexes: TsdbScenarioIndex[] }> = [
  {
    title: 'supports an upgraded TSDB data stream without additional indices',
    indexes: [{ index: BASE_STREAM }],
  },
  {
    title: 'supports an upgraded TSDB data stream with a regular index',
    indexes: [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
    ],
  },
  {
    title: 'supports an upgraded TSDB data stream with a downsampled TSDB stream',
    indexes: [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ],
  },
  {
    title: 'supports an upgraded TSDB data stream with regular and downsampled resources',
    indexes: [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ],
  },
  {
    title: 'supports an upgraded TSDB data stream with another TSDB stream',
    indexes: [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb' },
    ],
  },
];

const getIncompatibleAverageCount = async ({
  page,
  pageObjects,
}: TsdbScenarioContext): Promise<number> => {
  await pageObjects.lens.workspace.openFullEditor();
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
    operation: 'date_histogram',
    field: '@timestamp',
  });
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'min',
    field: 'bytes_counter',
    keepOpen: true,
  });

  const count = await page.testSubj
    .locator('lns-indexPatternDimension-average incompatible')
    .count();
  await pageObjects.lens.closeDimensionEditor();
  return count;
};

const getUpgradeBoundarySeries = async ({
  pageObjects,
}: Pick<TsdbScenarioContext, 'pageObjects'>): Promise<{
  counterBars: Array<{ y: number }>;
  countBars: Array<{ y: number }>;
}> => {
  await pageObjects.lens.workspace.openFullEditor();
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
    operation: 'date_histogram',
    field: '@timestamp',
    keepOpen: true,
  });

  // Bar charts disable empty rows by default. Keep empty buckets so the first and last bars
  // cover the complete range before and after the stream rollover.
  await pageObjects.lens.dimensions.enableIncludeEmptyRows();
  await pageObjects.lens.closeDimensionEditor();

  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'min',
    field: 'bytes_counter',
  });
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'count',
  });

  await pageObjects.lens.waitForVisualization('xyVisChart');
  const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
  return {
    counterBars: chartData.bars?.[0]?.bars ?? [],
    countBars: chartData.bars?.[1]?.bars ?? [],
  };
};

// Each scenario gets its own describe so that its Elasticsearch and data-view lifecycle runs in
// `beforeAll`/`afterAll`, which carry their own timeouts, leaving the 60s test timeout for UI work.
for (const { title, indexes } of SCENARIOS) {
  test.describe(`Lens TSDB stream upgrade: ${title}`, { tag: tags.deploymentAgnostic }, () => {
    const scenario = createTsdbStreamScenario({
      baseStream: BASE_STREAM,
      baseStreamKind: 'upgraded',
      indexes,
      timeRange: TIME_RANGE,
    });

    test.beforeAll(async ({ apiServices, tsdbHelper, uiSettings }) => {
      await scenario.setup({ apiServices, tsdbHelper, uiSettings });
    });

    test.beforeEach(async ({ browserAuth, context }) => {
      await enableElasticChartDebug(context);
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async () => scenario.cleanup());

    test('keeps the counter field compatible with Average', async ({ page, pageObjects }) => {
      expect(await getIncompatibleAverageCount({ page, pageObjects })).toBe(0);
    });

    test('visualizes counter data before and after the upgrade', async ({ pageObjects }) => {
      const { counterBars, countBars } = await getUpgradeBoundarySeries({ pageObjects });
      expect(counterBars.length).toBeGreaterThan(0);
      expect(countBars.length).toBeGreaterThan(0);

      expect.soft(counterBars[0]?.y).toBe(5000);
      expect.soft(counterBars[counterBars.length - 1]?.y).toBe(5000);

      // Bucket boundaries can vary with chart interval selection. Lens does not count a
      // downsample target as an additional contribution beside its source stream.
      const columnsToCheck = Math.floor(countBars.length / 2);
      expect
        .soft(sumFirstNValues(columnsToCheck, countBars))
        .toBeGreaterThan(scenario.expectedDocumentCountBeforeRollover - 1);
      expect
        .soft(sumFirstNValues(columnsToCheck, [...countBars].reverse()))
        .toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
    });
  });
}
