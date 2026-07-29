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
  sumFirstNValues,
  test,
} from '../../fixtures';
import type { TsdbScenarioContext, TsdbScenarioIndex } from '../../fixtures';

const RESOURCE_SUFFIX = `${process.pid}-${Date.now()}`;
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_upgrade_${RESOURCE_SUFFIX}`;
const REGULAR_INDEX = `kibana_sample_data_lens_tsdb_regular_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_tsdb_additional_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

interface ScenarioResult {
  counterBars: Array<{ y: number }> | undefined;
  countBars: Array<{ y: number }> | undefined;
  expectedDocumentCountBeforeUpgrade: number;
}

const runScenario = async (
  { page, pageObjects, tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<ScenarioResult> => {
  const scenario = await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);

  await test.step('detect the upgraded data stream as TSDB', async () => {
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

    await expect(
      page.testSubj.locator('lns-indexPatternDimension-average incompatible')
    ).toHaveCount(0);
    await pageObjects.lens.closeDimensionEditor();
  });

  return test.step('visualize counter data before and after the upgrade', async () => {
    // Start with a clean editor, matching the FTR beforeEach boundary between its two journey steps.
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
      operation: 'min',
      field: 'bytes_counter',
    });
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'count',
    });

    await pageObjects.lens.waitForVisualization('xyVisChart');
    const chartData = await getChartDebugData(page, 'xyVisChart');

    return {
      counterBars: chartData.bars?.[0]?.bars,
      countBars: chartData.bars?.[1]?.bars,
      expectedDocumentCountBeforeUpgrade: scenario.expectedDocumentCountBeforeUpgrade,
    };
  });
};

const getScenarioData = ({ counterBars, countBars }: ScenarioResult) => {
  // Bucket boundaries can vary with chart interval selection. Lens does not count a downsample
  // target as an additional contribution beside its source stream.
  const columnsToCheck = countBars ? countBars.length / 2 : 0;
  return {
    firstCounter: counterBars?.[0]?.y,
    lastCounter: counterBars?.[counterBars.length - 1]?.y,
    beforeUpgradeCount: sumFirstNValues(columnsToCheck, countBars),
    afterUpgradeCount: sumFirstNValues(columnsToCheck, [...(countBars ?? [])].reverse()),
  };
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
    const data = getScenarioData(result);
    expect(data.firstCounter).toBe(5000);
    expect(data.lastCounter).toBe(5000);
    expect(data.beforeUpgradeCount).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
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
    const data = getScenarioData(result);
    expect(data.firstCounter).toBe(5000);
    expect(data.lastCounter).toBe(5000);
    expect(data.beforeUpgradeCount).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
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
    const data = getScenarioData(result);
    expect(data.firstCounter).toBe(5000);
    expect(data.lastCounter).toBe(5000);
    expect(data.beforeUpgradeCount).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
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
    const data = getScenarioData(result);
    expect(data.firstCounter).toBe(5000);
    expect(data.lastCounter).toBe(5000);
    expect(data.beforeUpgradeCount).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
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
    const data = getScenarioData(result);
    expect(data.firstCounter).toBe(5000);
    expect(data.lastCounter).toBe(5000);
    expect(data.beforeUpgradeCount).toBeGreaterThan(result.expectedDocumentCountBeforeUpgrade - 1);
    expect(data.afterUpgradeCount).toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);
  });
});
