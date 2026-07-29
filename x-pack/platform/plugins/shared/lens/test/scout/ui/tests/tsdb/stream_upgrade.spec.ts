/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ScoutTestFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  TSDB_SCENARIO_DOCUMENT_COUNT,
  createTsdbScenarioTimeRange,
  enableElasticChartDebug,
  test,
} from '../../fixtures';
import type { TsdbScenario, TsdbScenarioIndex } from '../../fixtures';

const RESOURCE_SUFFIX = `${process.pid}-${Date.now()}`;
// Serverless Security's editor role grants data access to the sample-data namespace.
const BASE_STREAM = `kibana_sample_data_lens_tsdb_upgrade_${RESOURCE_SUFFIX}`;
const REGULAR_INDEX = `kibana_sample_data_lens_tsdb_regular_${RESOURCE_SUFFIX}`;
const ADDITIONAL_TSDB_STREAM = `kibana_sample_data_lens_tsdb_additional_${RESOURCE_SUFFIX}`;
const TIME_RANGE = createTsdbScenarioTimeRange();

interface ScenarioContext {
  page: ScoutTestFixtures['page'];
  pageObjects: ScoutTestFixtures['pageObjects'];
  tsdbScenario: TsdbScenario;
}

interface ScenarioResult {
  counterBars: Array<{ y: number }> | undefined;
  countBars: Array<{ y: number }> | undefined;
  expectedDocumentCountBeforeUpgrade: number;
}

const sumFirstNValues = (count: number, bars: Array<{ y: number }> | undefined): number =>
  (bars ?? []).slice(0, count).reduce((sum, bar) => sum + bar.y, 0);

const runScenario = async (
  { page, pageObjects, tsdbScenario }: ScenarioContext,
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
    const includeEmptyRows = page.testSubj.locator('indexPattern-include-empty-rows');
    await expect(includeEmptyRows).toHaveAttribute('aria-checked', 'false');
    await includeEmptyRows.click();
    await expect(includeEmptyRows).toHaveAttribute('aria-checked', 'true');
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

    return {
      counterBars: chartData.bars?.[0]?.bars,
      countBars: chartData.bars?.[1]?.bars,
      expectedDocumentCountBeforeUpgrade: scenario.expectedDocumentCountBeforeUpgrade,
    };
  });
};

const expectScenarioData = ({
  counterBars,
  countBars,
  expectedDocumentCountBeforeUpgrade,
}: ScenarioResult): void => {
  expect(counterBars?.[0]?.y).toBe(5000);
  expect(counterBars?.[counterBars.length - 1]?.y).toBe(5000);

  // Bucket boundaries can vary with chart interval selection. The lower bound accounts for every
  // logical scenario index. Lens does not count a downsample target as an additional contribution
  // beside its source stream, so a missing regular index or stream still lowers this total by 100.
  const columnsToCheck = countBars ? countBars.length / 2 : 0;
  expect(sumFirstNValues(columnsToCheck, countBars)).toBeGreaterThan(
    expectedDocumentCountBeforeUpgrade - 1
  );
  expect(sumFirstNValues(columnsToCheck, [...(countBars ?? [])].reverse())).toBeGreaterThan(
    TSDB_SCENARIO_DOCUMENT_COUNT - 1
  );
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
    expectScenarioData(result);
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
    expectScenarioData(result);
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
    expectScenarioData(result);
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
    expectScenarioData(result);
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
    expectScenarioData(result);
  });
});
