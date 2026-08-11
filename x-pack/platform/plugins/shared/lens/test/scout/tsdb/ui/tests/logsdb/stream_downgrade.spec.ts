/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createTsdbScenarioTimeRange,
  enableElasticChartDebug,
  offsetPickerTime,
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
const LOGSDB_STREAM_NO_HOST = `kibana_sample_data_lens_logsdb_nohost_${RESOURCE_SUFFIX}`;
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
  /** Bar chart data using the utc_time date field instead of @timestamp. */
  altDateFieldBars: Array<{ y: number }>;
}

const runScenario = async (
  { page, pageObjects, tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<ScenarioResult> => {
  await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);

  const bars = await test.step('visualize date histogram chart', async () => {
    await pageObjects.lens.workspace.openFullEditor();
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });

    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes',
    });

    await pageObjects.lens.waitForVisualization('xyVisChart');
    const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
    const chartBars = chartData.bars?.[0]?.bars ?? [];
    expect(chartBars.length).toBeGreaterThan(0);
    return chartBars;
  });

  const includesBaseStream = indexes.some(({ index }) => index === BASE_STREAM);
  const { hasDataBeforeDowngrade, hasDataAfterDowngrade } = includesBaseStream
    ? await test.step('visualize data on both sides of the downgrade boundary', async () => {
        await pageObjects.lens.workspace.openFullEditor();
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
          field: 'bytes',
        });

        await pageObjects.lens.waitForVisualization('xyVisChart');
        const barsBeforeDowngrade =
          (await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart')).bars?.[0]
            ?.bars ?? [];

        await pageObjects.datePicker.setAbsoluteRange({
          from: offsetPickerTime(TIME_RANGE.afterRollover, ONE_SECOND),
          to: offsetPickerTime(TIME_RANGE.afterRollover, TWO_HOURS),
        });
        await pageObjects.lens.waitForVisualization('xyVisChart');
        const barsAfterDowngrade =
          (await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart')).bars?.[0]
            ?.bars ?? [];

        return {
          hasDataBeforeDowngrade: barsBeforeDowngrade.some(({ y }) => y > 0),
          hasDataAfterDowngrade: barsAfterDowngrade.some(({ y }) => y > 0),
        };
      })
    : { hasDataBeforeDowngrade: false, hasDataAfterDowngrade: false };

  const altDateFieldBars =
    await test.step('visualize date histogram chart using a different date field', async () => {
      await pageObjects.lens.workspace.openFullEditor();
      await pageObjects.datePicker.setAbsoluteRange(TIME_RANGE.picker);
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'utc_time',
      });

      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
        field: 'bytes',
      });

      await pageObjects.lens.waitForVisualization('xyVisChart');
      const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
      const chartBars = chartData.bars?.[0]?.bars ?? [];
      expect(chartBars.length).toBeGreaterThan(0);
      return chartBars;
    });

  const checkAnnotationLayer = async (timeField: string, extraFields: string[]): Promise<void> => {
    await pageObjects.lens.workspace.openFullEditor();
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: 'utc_time',
    });
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes',
    });
    await pageObjects.lens.layers.createLayer('annotations');

    const layerCount = await pageObjects.lens.layers.getLayerCount();
    expect(layerCount).toBe(2);

    await pageObjects.lens.layers.ensureLayerTabIsActive(1);
    const triggerText = await pageObjects.lens.dimensions.getDimensionTriggerText(
      'lnsXY_xAnnotationsPanel'
    );
    expect(triggerText).toBe('Event');

    await pageObjects.lens.dimensions.openDimensionEditor('lns-dimensionTrigger', 1);
    await page.testSubj.click('lnsXY_annotation_query');
    await pageObjects.lens.style.configureQueryAnnotation({
      queryString: 'host.name: *',
      timeField,
      textDecoration: { type: 'name' },
      extraFields,
    });
    await pageObjects.lens.closeDimensionEditor();

    // Multiple annotation icons may render on the chart; check that at least one exists.
    const annotationIcons = page.testSubj.locator('xyVisGroupedAnnotationIcon');
    await expect(annotationIcons).not.toHaveCount(0);

    await pageObjects.lens.layers.removeLayer(1);
  };

  await test.step('visualize an annotation layer from a LogsDB stream', async () =>
    checkAnnotationLayer('@timestamp', ['host.name', 'utc_time']));

  await test.step('visualize an annotation layer using another time field', async () =>
    checkAnnotationLayer('utc_time', ['host.name', '@timestamp']));

  await test.step('visualize ES|QL queries based on a LogsDB stream', async () => {
    await page.gotoApp('discover');

    const esqlQuery = `from ${indexes
      .map(({ index }) => index)
      .join(', ')} | stats averageB = avg(bytes) by extension`;
    await pageObjects.discover.writeAndSubmitEsqlQuery(esqlQuery);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await pageObjects.discover.openLensEditFlyout();

    await expect
      .poll(
        async () => {
          const dimensions = await page.testSubj.locator('lns-dimensionTrigger-textBased').all();
          if (dimensions.length !== 2) return false;
          const text = await dimensions[1].innerText();
          return text === 'averageB';
        },
        { timeout: 10_000 }
      )
      .toBe(true);

    // Navigate back to Lens for the next scenario
    await page.gotoApp('lens');
  });

  return {
    bars,
    hasDataBeforeDowngrade,
    hasDataAfterDowngrade,
    altDateFieldBars,
  };
};

/**
 * Asserts common visualization results. When `includesBaseStream` is true (default),
 * also checks the downgrade rollover boundary — data exists on both sides.
 * Standalone scenarios (e.g. no-host) don't include the downgraded base stream
 * and only verify that the chart rendered data.
 */
const assertDowngradeResult = (
  result: ScenarioResult,
  { includesBaseStream = true }: { includesBaseStream?: boolean } = {}
) => {
  // FTR parity: the first and last rendered buckets contain data for both date fields.
  expect.soft(result.bars[0]?.y).toBeGreaterThan(0);
  expect.soft(result.bars[result.bars.length - 1]?.y).toBeGreaterThan(0);
  expect.soft(result.altDateFieldBars[0]?.y).toBeGreaterThan(0);
  expect.soft(result.altDateFieldBars[result.altDateFieldBars.length - 1]?.y).toBeGreaterThan(0);

  if (includesBaseStream) {
    // Scout additionally checks the downgrade boundary with narrow time ranges.
    expect.soft(result.hasDataBeforeDowngrade).toBe(true);
    expect.soft(result.hasDataAfterDowngrade).toBe(true);
  }
};

// Cloud serverless is excluded due to https://github.com/elastic/kibana/issues/195089.
const logsDBDeploymentTags = [
  ...tags.stateful.classic,
  '@local-serverless-search',
  '@local-serverless-observability_complete',
  '@local-serverless-security_complete',
];

test.describe('Lens LogsDB stream downgrade scenarios', { tag: logsDBDeploymentTags }, () => {
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

  test('supports a LogsDB stream without a predefined host.name mapping', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: LOGSDB_STREAM_NO_HOST, create: true, mode: 'logsdb', removeLogsDBFields: true },
    ]);
    // Standalone stream without the downgraded base stream — no rollover boundary to check
    assertDowngradeResult(result, { includesBaseStream: false });
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
