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

interface LogsDBScenario {
  title: string;
  indexes: TsdbScenarioIndex[];
}

const setupScenario = async (
  { tsdbScenario }: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<void> => {
  await tsdbScenario.setup(BASE_STREAM, indexes, TIME_RANGE);
};

const visualizeTimestampHistogram = async (
  context: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<void> => {
  const { pageObjects } = context;
  await setupScenario(context, indexes);
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
  const bars = chartData.bars?.[0]?.bars ?? [];
  expect(bars[0]?.y).toBeGreaterThan(0);
  expect(bars[bars.length - 1]?.y).toBeGreaterThan(0);

  if (!indexes.some(({ index }) => index === BASE_STREAM)) {
    return;
  }

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
    (await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart')).bars?.[0]?.bars ??
    [];
  expect(barsBeforeDowngrade.some(({ y }) => y > 0)).toBe(true);

  await pageObjects.datePicker.setAbsoluteRange({
    from: offsetPickerTime(TIME_RANGE.afterRollover, ONE_SECOND),
    to: offsetPickerTime(TIME_RANGE.afterRollover, TWO_HOURS),
  });
  await pageObjects.lens.waitForVisualization('xyVisChart');
  const barsAfterDowngrade =
    (await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart')).bars?.[0]?.bars ??
    [];
  expect(barsAfterDowngrade.some(({ y }) => y > 0)).toBe(true);
};

const visualizeAlternateDateHistogram = async (
  context: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<void> => {
  const { pageObjects } = context;
  await setupScenario(context, indexes);
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
  const bars = chartData.bars?.[0]?.bars ?? [];
  expect(bars[0]?.y).toBeGreaterThan(0);
  expect(bars[bars.length - 1]?.y).toBeGreaterThan(0);
};

const visualizeAnnotation = async (
  context: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[],
  timeField: string,
  extraFields: string[]
): Promise<void> => {
  const { page, pageObjects } = context;
  await setupScenario(context, indexes);
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

  expect(await pageObjects.lens.layers.getLayerCount()).toBe(2);
  await pageObjects.lens.layers.ensureLayerTabIsActive(1);
  expect(await pageObjects.lens.dimensions.getDimensionTriggerText('lnsXY_xAnnotationsPanel')).toBe(
    'Event'
  );

  await pageObjects.lens.dimensions.openDimensionEditor('lns-dimensionTrigger', 1);
  await page.testSubj.click('lnsXY_annotation_query');
  await pageObjects.lens.style.configureQueryAnnotation({
    queryString: 'host.name: *',
    timeField,
    textDecoration: { type: 'name' },
    extraFields,
  });
  await pageObjects.lens.closeDimensionEditor();

  const annotationIcons = page.testSubj.locator('xyVisGroupedAnnotationIcon');
  await expect(annotationIcons).not.toHaveCount(0);
};

const visualizeEsql = async (
  context: TsdbScenarioContext,
  indexes: TsdbScenarioIndex[]
): Promise<void> => {
  const { page, pageObjects } = context;
  await setupScenario(context, indexes);
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
};

const logsDBScenarios: LogsDBScenario[] = [
  {
    title: 'a downgraded LogsDB data stream without additional indices',
    indexes: [{ index: BASE_STREAM }],
  },
  {
    title: 'a LogsDB stream without a predefined host.name mapping',
    indexes: [
      { index: LOGSDB_STREAM_NO_HOST, create: true, mode: 'logsdb', removeLogsDBFields: true },
    ],
  },
  {
    title: 'a downgraded LogsDB data stream with a regular index',
    indexes: [
      { index: BASE_STREAM },
      { index: REGULAR_INDEX, create: true, removeTSDBFields: true },
    ],
  },
  {
    title: 'a downgraded LogsDB data stream with another LogsDB stream',
    indexes: [
      { index: BASE_STREAM },
      { index: ADDITIONAL_LOGSDB_STREAM, create: true, mode: 'logsdb' },
    ],
  },
  {
    title: 'a downgraded LogsDB data stream with a TSDB stream',
    indexes: [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_STREAM, create: true, mode: 'tsdb' },
    ],
  },
  {
    title: 'a downgraded LogsDB data stream with a downsampled TSDB stream',
    indexes: [
      { index: BASE_STREAM },
      { index: ADDITIONAL_TSDB_DOWNSAMPLED, create: true, mode: 'tsdb', downsample: true },
    ],
  },
];

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

  for (const { title, indexes } of logsDBScenarios) {
    test(`renders a timestamp histogram for ${title}`, async ({
      page,
      pageObjects,
      tsdbScenario,
    }) => {
      await visualizeTimestampHistogram({ page, pageObjects, tsdbScenario }, indexes);
    });

    test(`renders an alternate-date histogram for ${title}`, async ({
      page,
      pageObjects,
      tsdbScenario,
    }) => {
      await visualizeAlternateDateHistogram({ page, pageObjects, tsdbScenario }, indexes);
    });

    test(`renders a timestamp annotation for ${title}`, async ({
      page,
      pageObjects,
      tsdbScenario,
    }) => {
      await visualizeAnnotation({ page, pageObjects, tsdbScenario }, indexes, '@timestamp', [
        'host.name',
        'utc_time',
      ]);
    });

    test(`renders an alternate-time-field annotation for ${title}`, async ({
      page,
      pageObjects,
      tsdbScenario,
    }) => {
      await visualizeAnnotation({ page, pageObjects, tsdbScenario }, indexes, 'utc_time', [
        'host.name',
        '@timestamp',
      ]);
    });

    test(`opens an ES|QL visualization from Discover for ${title}`, async ({
      page,
      pageObjects,
      tsdbScenario,
    }) => {
      await visualizeEsql({ page, pageObjects, tsdbScenario }, indexes);
    });
  }
});
