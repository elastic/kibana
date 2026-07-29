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

const RESOURCE_SUFFIX = `${process.pid}-${Date.now()}`;
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_downgrade_${RESOURCE_SUFFIX}`;
const REGULAR_INDEX = `kibana_sample_data_lens_tsdb_regular_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_tsdb_additional_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

interface ScenarioResult {
  /** Count of `lns-indexPatternDimension-average incompatible` elements. */
  incompatibleAverageCount: number;
  /** Bar chart data from the full time range with empty rows enabled. */
  bars: Array<{ y: number }> | undefined;
  /** Whether the before-downgrade time window contains any data. */
  hasDataBeforeDowngrade: boolean;
  /** Whether the after-downgrade time window contains any data. */
  hasDataAfterDowngrade: boolean;
  expectedDocumentCountBeforeUpgrade: number;
}

// The downgraded base stream has mixed backing-index mappings (old TSDB + new regular).
// Elasticsearch field caps reports metric_conflicts_indices and omits time_series_metric,
// so Lens sees bytes_counter as a plain numeric field and keeps Average enabled — even when
// another pure TSDB stream is added to the data view. The removed FTR assertion intended to
// vary by scenario but never awaited testSubjects.exists(), making it a silent no-op.
// The assertions in each test body lock in the observed product behavior.

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

  const bars = await test.step('visualize count data before and after the downgrade', async () => {
    // Start with a clean editor, matching the FTR beforeEach boundary between journey steps.
    await pageObjects.lens.openFullEditor();
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
      keepOpen: true,
    });

    // Bar charts disable empty rows by default. Keep empty buckets so the first and last bars cover
    // the complete range before and after the stream rollover.
    await pageObjects.lens.enableIncludeEmptyRows();
    await pageObjects.lens.closeDimensionEditor();

    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'count',
    });

    await pageObjects.lens.waitForVisualization('xyVisChart');
    return (await getChartDebugData(page, 'xyVisChart')).bars?.[0]?.bars;
  });

  const { hasDataBeforeDowngrade, hasDataAfterDowngrade } =
    await test.step('visualize data on both sides of the downgrade boundary', async () => {
      // Start with another clean editor, matching the third FTR journey step.
      await pageObjects.lens.openFullEditor();
      await pageObjects.datePicker.setAbsoluteRange({
        from: offsetPickerTime(TIME_RANGE.beforeUpgrade, -60 * 60 * 1000),
        to: offsetPickerTime(TIME_RANGE.beforeUpgrade, 60 * 60 * 1000),
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
      });

      await pageObjects.lens.waitForVisualization('xyVisChart');
      const barsBeforeDowngrade = (await getChartDebugData(page, 'xyVisChart')).bars?.[0]?.bars;

      await pageObjects.datePicker.setAbsoluteRange({
        from: offsetPickerTime(TIME_RANGE.afterUpgrade, 1000),
        to: offsetPickerTime(TIME_RANGE.afterUpgrade, 2 * 60 * 60 * 1000),
      });
      await pageObjects.lens.waitForVisualization('xyVisChart');
      const barsAfterDowngrade = (await getChartDebugData(page, 'xyVisChart')).bars?.[0]?.bars;

      return {
        hasDataBeforeDowngrade: barsBeforeDowngrade?.some(({ y }) => y > 0) ?? false,
        hasDataAfterDowngrade: barsAfterDowngrade?.some(({ y }) => y > 0) ?? false,
      };
    });

  return {
    incompatibleAverageCount,
    bars,
    hasDataBeforeDowngrade,
    hasDataAfterDowngrade,
    expectedDocumentCountBeforeUpgrade: scenario.expectedDocumentCountBeforeUpgrade,
  };
};

const getScenarioDataCounts = ({ bars }: ScenarioResult) => {
  // Bucket boundaries can vary with chart interval selection. Lens does not count a downsample
  // target as an additional contribution beside its source stream.
  const columnsToCheck = bars ? bars.length / 2 : 0;
  return {
    beforeDowngrade: sumFirstNValues(columnsToCheck, bars),
    afterDowngrade: sumFirstNValues(columnsToCheck, [...(bars ?? [])].reverse()),
  };
};

test.describe('Lens TSDB stream downgrade scenarios', { tag: tags.deploymentAgnostic }, () => {
  let cleanupBaseStream: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ tsdbHelper }) => {
    const baseStream = await tsdbHelper.createDowngradedStream(BASE_STREAM, TIME_RANGE);
    cleanupBaseStream = baseStream.cleanup;
  });

  test.beforeEach(async ({ browserAuth, context }) => {
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async () => {
    await cleanupBaseStream?.();
  });

  test('supports a downgraded TSDB data stream without additional indices', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [{ index: BASE_STREAM }]);
    expect(result.incompatibleAverageCount).toBe(0);
    expect(result.hasDataBeforeDowngrade).toBe(true);
    expect(result.hasDataAfterDowngrade).toBe(true);
    const counts = getScenarioDataCounts(result);
    expect(counts.beforeDowngrade).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(counts.afterDowngrade).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });

  test('supports a downgraded TSDB data stream with a regular index', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
    ]);
    expect(result.incompatibleAverageCount).toBe(0);
    expect(result.hasDataBeforeDowngrade).toBe(true);
    expect(result.hasDataAfterDowngrade).toBe(true);
    const counts = getScenarioDataCounts(result);
    expect(counts.beforeDowngrade).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(counts.afterDowngrade).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });

  test('supports a downgraded TSDB data stream with a downsampled TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ]);
    expect(result.incompatibleAverageCount).toBe(0);
    expect(result.hasDataBeforeDowngrade).toBe(true);
    expect(result.hasDataAfterDowngrade).toBe(true);
    const counts = getScenarioDataCounts(result);
    expect(counts.beforeDowngrade).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(counts.afterDowngrade).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });

  test('supports a downgraded TSDB data stream with regular and downsampled resources', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb', downsample: true },
    ]);
    expect(result.incompatibleAverageCount).toBe(0);
    expect(result.hasDataBeforeDowngrade).toBe(true);
    expect(result.hasDataAfterDowngrade).toBe(true);
    const counts = getScenarioDataCounts(result);
    expect(counts.beforeDowngrade).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(counts.afterDowngrade).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });

  test('supports a downgraded TSDB data stream with another TSDB stream', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb' },
    ]);
    expect(result.incompatibleAverageCount).toBe(0);
    expect(result.hasDataBeforeDowngrade).toBe(true);
    expect(result.hasDataAfterDowngrade).toBe(true);
    const counts = getScenarioDataCounts(result);
    expect(counts.beforeDowngrade).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(counts.afterDowngrade).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });
});
