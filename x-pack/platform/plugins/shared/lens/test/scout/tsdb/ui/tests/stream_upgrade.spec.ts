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

interface ScenarioResult {
  /** Count of `lns-indexPatternDimension-average incompatible` elements. */
  incompatibleAverageCount: number;
  counterBars: Array<{ y: number }>;
  countBars: Array<{ y: number }>;
  expectedDocumentCountBeforeRollover: number;
}

const runScenario = async (
  { page, pageObjects, tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<ScenarioResult> => {
  const scenario = await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);

  const incompatibleAverageCount =
    await test.step('check counter field compatibility', async () => {
      await pageObjects.lens.openFullEditor();
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
    });

  const { counterBars, countBars } =
    await test.step('visualize counter data before and after the upgrade', async () => {
      // Each step needs an empty editor, so reload Lens to clear prior dimensions.
      await pageObjects.lens.openFullEditor();
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        keepOpen: true,
      });

      // Bar charts disable empty rows by default. Keep empty buckets so the first and last bars
      // cover the complete range before and after the stream rollover.
      await pageObjects.lens.enableIncludeEmptyRows();
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
      const chartData = await pageObjects.lens.getCurrentChartDebugState('xyVisChart');
      const counterSeries = chartData.bars?.[0]?.bars ?? [];
      const countSeries = chartData.bars?.[1]?.bars ?? [];
      expect(counterSeries.length).toBeGreaterThan(0);
      expect(countSeries.length).toBeGreaterThan(0);
      return { counterBars: counterSeries, countBars: countSeries };
    });

  return {
    incompatibleAverageCount,
    counterBars,
    countBars,
    expectedDocumentCountBeforeRollover: scenario.expectedDocumentCountBeforeRollover,
  };
};

const getScenarioData = ({ counterBars, countBars }: ScenarioResult) => {
  // Bucket boundaries can vary with chart interval selection. Lens does not count a downsample
  // target as an additional contribution beside its source stream.
  const columnsToCheck = Math.floor(countBars.length / 2);
  return {
    firstCounter: counterBars[0]?.y,
    lastCounter: counterBars[counterBars.length - 1]?.y,
    beforeUpgradeCount: sumFirstNValues(columnsToCheck, countBars),
    afterUpgradeCount: sumFirstNValues(columnsToCheck, [...countBars].reverse()),
  };
};

const assertUpgradeResult = (result: ScenarioResult) => {
  expect.soft(result.incompatibleAverageCount).toBe(0);
  const data = getScenarioData(result);
  expect.soft(data.firstCounter).toBe(5000);
  expect.soft(data.lastCounter).toBe(5000);
  expect
    .soft(data.beforeUpgradeCount)
    .toBeGreaterThan(result.expectedDocumentCountBeforeRollover - 1);
  expect.soft(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
};

test.describe('Lens TSDB stream upgrade scenarios', { tag: tags.deploymentAgnostic }, () => {
  let cleanupBaseStream: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ tsdbHelper }) => {
    const baseStream = await tsdbHelper.createUpgradedStream(BASE_STREAM, TIME_RANGE);
    cleanupBaseStream = baseStream.cleanup;
  });

  test.beforeEach(async ({ browserAuth, context }) => {
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async () => {
    await cleanupBaseStream?.();
  });

  test('supports an upgraded TSDB data stream without additional indices', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [{ index: BASE_STREAM }]);
    assertUpgradeResult(result);
  });

  test('supports an upgraded TSDB data stream with a regular index', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
    ]);
    assertUpgradeResult(result);
  });

  test('supports an upgraded TSDB data stream with a downsampled TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ]);
    assertUpgradeResult(result);
  });

  test('supports an upgraded TSDB data stream with regular and downsampled resources', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ]);
    assertUpgradeResult(result);
  });

  test('supports an upgraded TSDB data stream with another TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb' },
    ]);
    assertUpgradeResult(result);
  });
});
