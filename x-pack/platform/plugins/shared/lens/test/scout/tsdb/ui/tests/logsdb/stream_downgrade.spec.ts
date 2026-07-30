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
  /** Whether the annotation layer rendered with @timestamp time field. */
  annotationVisible: boolean;
  /** Whether the annotation layer rendered with utc_time time field. */
  annotationAltTimeFieldVisible: boolean;
  expectedDocumentCountBeforeRollover: number;
}

const runScenario = async (
  { page, pageObjects, tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<ScenarioResult> => {
  const scenario = await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);

  const bars = await test.step('visualize date histogram chart', async () => {
    await pageObjects.lens.workspace.openFullEditor();
    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
      keepOpen: true,
    });
    await pageObjects.lens.dimensions.enableIncludeEmptyRows();
    await pageObjects.lens.closeDimensionEditor();

    await pageObjects.lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'min',
      field: 'bytes_counter',
    });

    await pageObjects.lens.waitForVisualization('xyVisChart');
    const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
    const chartBars = chartData.bars?.[0]?.bars ?? [];
    expect(chartBars.length).toBeGreaterThan(0);
    return chartBars;
  });

  const { hasDataBeforeDowngrade, hasDataAfterDowngrade } =
    await test.step('visualize data on both sides of the downgrade boundary', async () => {
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
        field: 'bytes_counter',
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
    });

  const altDateFieldBars =
    await test.step('visualize date histogram chart using a different date field', async () => {
      await pageObjects.lens.workspace.openFullEditor();
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'utc_time',
        keepOpen: true,
      });
      await pageObjects.lens.dimensions.enableIncludeEmptyRows();
      await pageObjects.lens.closeDimensionEditor();

      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
        field: 'bytes_counter',
      });

      await pageObjects.lens.waitForVisualization('xyVisChart');
      const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
      const chartBars = chartData.bars?.[0]?.bars ?? [];
      expect(chartBars.length).toBeGreaterThan(0);
      return chartBars;
    });

  const annotationVisible =
    await test.step('visualize an annotation layer from a LogsDB stream', async () => {
      await pageObjects.lens.workspace.openFullEditor();
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'utc_time',
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
        field: 'bytes_counter',
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
        queryString: 'request: *',
        timeField: '@timestamp',
        textDecoration: { type: 'name' },
        extraFields: ['request', 'utc_time'],
      });
      await pageObjects.lens.closeDimensionEditor();

      const annotationIcon = page.testSubj.locator('xyVisGroupedAnnotationIcon');
      const isVisible = await annotationIcon.isVisible();

      await pageObjects.lens.layers.removeLayer(1);
      return isVisible;
    });

  const annotationAltTimeFieldVisible =
    await test.step('visualize an annotation layer using another time field', async () => {
      await pageObjects.lens.workspace.openFullEditor();
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: 'utc_time',
      });
      await pageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
        field: 'bytes_counter',
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
        queryString: 'request: *',
        timeField: 'utc_time',
        textDecoration: { type: 'name' },
        extraFields: ['request', '@timestamp'],
      });
      await pageObjects.lens.closeDimensionEditor();

      const annotationIcon = page.testSubj.locator('xyVisGroupedAnnotationIcon');
      const isVisible = await annotationIcon.isVisible();

      await pageObjects.lens.layers.removeLayer(1);
      return isVisible;
    });

  await test.step('visualize ES|QL queries based on a LogsDB stream', async () => {
    await page.gotoApp('discover');

    const esqlQuery = `from ${indexes
      .map(({ index }) => index)
      .join(', ')} | stats averageB = avg(bytes_counter) by request`;
    await pageObjects.discover.writeAndSubmitEsqlQuery(esqlQuery);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    await page.testSubj.click('unifiedHistogramEditFlyoutVisualization');

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
    annotationVisible,
    annotationAltTimeFieldVisible,
    expectedDocumentCountBeforeRollover: scenario.expectedDocumentCountBeforeRollover,
  };
};

const assertDowngradeResult = (result: ScenarioResult) => {
  // Date histogram with @timestamp
  expect.soft(result.hasDataBeforeDowngrade).toBe(true);
  expect.soft(result.hasDataAfterDowngrade).toBe(true);
  const columnsToCheck = Math.floor(result.bars.length / 2);
  expect
    .soft(sumFirstNValues(columnsToCheck, result.bars))
    .toBeGreaterThan(result.expectedDocumentCountBeforeRollover - 1);
  expect
    .soft(sumFirstNValues(columnsToCheck, [...result.bars].reverse()))
    .toBeGreaterThan(TSDB_SCENARIO_DOCUMENT_COUNT - 1);

  // Date histogram with utc_time
  const altColumnsToCheck = Math.floor(result.altDateFieldBars.length / 2);
  expect.soft(sumFirstNValues(altColumnsToCheck, result.altDateFieldBars)).toBeGreaterThan(0);
  expect
    .soft(sumFirstNValues(altColumnsToCheck, [...result.altDateFieldBars].reverse()))
    .toBeGreaterThan(0);

  // Annotation layers
  expect.soft(result.annotationVisible).toBe(true);
  expect.soft(result.annotationAltTimeFieldVisible).toBe(true);
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

  test('supports a downgraded LogsDB data stream without host.name field', async ({
    page,
    pageObjects,
    tsdbScenario,
  }) => {
    const result = await runScenario({ page, pageObjects, tsdbScenario }, [
      { index: LOGSDB_STREAM_NO_HOST, create: true, mode: 'logsdb', removeLogsDBFields: true },
    ]);
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
