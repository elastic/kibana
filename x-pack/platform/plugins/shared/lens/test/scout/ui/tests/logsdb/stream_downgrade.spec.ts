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
  getChartDebugData,
  offsetPickerTime,
  sumFirstNValues,
  test,
} from '../../fixtures';
import type { TsdbScenarioContext, TsdbScenarioIndex } from '../../fixtures';

const ONE_SECOND = 1000;
const ONE_HOUR = 60 * 60 * 1000;
const TWO_HOURS = 2 * ONE_HOUR;

const RESOURCE_SUFFIX = `${process.pid}-${Date.now()}`;
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_logsdb_downgrade_${RESOURCE_SUFFIX}`;
const REGULAR_INDEX = `kibana_sample_data_lens_logsdb_regular_${RESOURCE_SUFFIX}`;
const ADDITIONAL_LOGSDB_STREAM = `kibana_sample_data_lens_logsdb_additional_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_logsdb_tsdb_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_DOWNSAMPLED = `kibana_sample_data_lens_logsdb_tsdb_ds_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

interface ScenarioResult {
  /** Bar chart data from the full time range with empty rows enabled. */
  bars: Array<{ y: number }>;
  /** Whether the before-downgrade time window contains any data. */
  hasDataBeforeDowngrade: boolean;
  /** Whether the after-downgrade time window contains any data. */
  hasDataAfterDowngrade: boolean;
  expectedDocumentCountBeforeRollover: number;
}

const runScenario = async (
  { page, pageObjects, tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<ScenarioResult> => {
  const scenario = await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);

  const bars = await test.step('visualize date histogram chart', async () => {
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

    // check that a basic agg on a field works
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes_counter',
    });

    await pageObjects.lens.waitForVisualization('xyVisChart');
    const chartData = await getChartDebugData(page, 'xyVisChart');
    const chartBars = chartData.bars?.[0]?.bars ?? [];
    expect(chartBars.length).toBeGreaterThan(0);
    return chartBars;
  });

  const { hasDataBeforeDowngrade, hasDataAfterDowngrade } =
    await test.step('visualize data on both sides of the downgrade boundary', async () => {
      // Reload Lens for a clean editor before narrowing the time window.
      await pageObjects.lens.openFullEditor();
      await pageObjects.datePicker.setAbsoluteRange({
        from: offsetPickerTime(TIME_RANGE.beforeRollover, -ONE_HOUR),
        to: offsetPickerTime(TIME_RANGE.beforeRollover, ONE_HOUR),
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
        field: 'bytes_counter',
      });

      await pageObjects.lens.waitForVisualization('xyVisChart');
      const barsBeforeDowngrade =
        (await getChartDebugData(page, 'xyVisChart')).bars?.[0]?.bars ?? [];

      await pageObjects.datePicker.setAbsoluteRange({
        from: offsetPickerTime(TIME_RANGE.afterRollover, ONE_SECOND),
        to: offsetPickerTime(TIME_RANGE.afterRollover, TWO_HOURS),
      });
      await pageObjects.lens.waitForVisualization('xyVisChart');
      const barsAfterDowngrade =
        (await getChartDebugData(page, 'xyVisChart')).bars?.[0]?.bars ?? [];

      return {
        hasDataBeforeDowngrade: barsBeforeDowngrade.some(({ y }) => y > 0),
        hasDataAfterDowngrade: barsAfterDowngrade.some(({ y }) => y > 0),
      };
    });

  return {
    bars,
    hasDataBeforeDowngrade,
    hasDataAfterDowngrade,
    expectedDocumentCountBeforeRollover: scenario.expectedDocumentCountBeforeRollover,
  };
};

const assertDowngradeResult = (result: ScenarioResult) => {
  expect.soft(result.hasDataBeforeDowngrade).toBe(true);
  expect.soft(result.hasDataAfterDowngrade).toBe(true);
  const columnsToCheck = Math.floor(result.bars.length / 2);
  expect
    .soft(sumFirstNValues(columnsToCheck, result.bars))
    .toBeGreaterThan(result.expectedDocumentCountBeforeRollover - 1);
  expect
    .soft(sumFirstNValues(columnsToCheck, [...result.bars].reverse()))
    .toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
};

test.describe('Lens LogsDB stream downgrade scenarios', { tag: tags.deploymentAgnostic }, () => {
  let cleanupBaseStream: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ tsdbHelper }) => {
    const baseStream = await tsdbHelper.createDowngradedLogsDBStream(BASE_STREAM, TIME_RANGE);
    cleanupBaseStream = baseStream.cleanup;
  });

  test.beforeEach(async ({ browserAuth, context }) => {
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async () => {
    await cleanupBaseStream?.();
  });

  test('supports a downgraded LogsDB data stream without additional indices', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [{ index: BASE_STREAM }]);
    assertDowngradeResult(result);
  });

  test('supports a downgraded LogsDB data stream with a regular index', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
    ]);
    assertDowngradeResult(result);
  });

  test('supports a downgraded LogsDB data stream with another LogsDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_LOGSDB_STREAM, create: true, mode: 'logsdb' },
    ]);
    assertDowngradeResult(result);
  });

  test('supports a downgraded LogsDB data stream with a TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb' },
    ]);
    assertDowngradeResult(result);
  });

  test('supports a downgraded LogsDB data stream with a downsampled TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_DOWNSAMPLED, create: true, mode: 'tsdb', downsample: true },
    ]);
    assertDowngradeResult(result);
  });
});
