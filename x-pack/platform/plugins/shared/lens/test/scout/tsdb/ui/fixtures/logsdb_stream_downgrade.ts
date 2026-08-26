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
  getDowngradeBoundaryData,
  runCleanupActions,
} from './tsdb_helpers';
import type { LensUiTestFixtures, LensUiWorkerFixtures, TsdbScenarioIndex } from './tsdb_helpers';

const TIME_RANGE = createTsdbScenarioTimeRange();

export type LogsDBScenarioType =
  | 'base'
  | 'no_host_mapping'
  | 'regular_index'
  | 'logsdb_stream'
  | 'tsdb_stream'
  | 'downsampled_tsdb_stream';

interface LogsDBScenarioConfig {
  title: string;
  type: LogsDBScenarioType;
}

type SetupFixtures = Pick<
  LensUiWorkerFixtures,
  'apiServices' | 'kbnClient' | 'uiSettings' | 'tsdbHelper'
>;
type LensFixtures = Pick<LensUiTestFixtures, 'page' | 'pageObjects'>;

const getScenarioIndexes = (
  type: LogsDBScenarioType,
  baseStream: string,
  additionalResource: string
): TsdbScenarioIndex[] => {
  switch (type) {
    case 'base':
      return [{ index: baseStream }];
    case 'no_host_mapping':
      return [
        {
          index: additionalResource,
          create: true,
          mode: 'logsdb',
          removeLogsDBFields: true,
        },
      ];
    case 'regular_index':
      return [
        { index: baseStream },
        { index: additionalResource, create: true, removeTSDBFields: true },
      ];
    case 'logsdb_stream':
      return [{ index: baseStream }, { index: additionalResource, create: true, mode: 'logsdb' }];
    case 'tsdb_stream':
      return [{ index: baseStream }, { index: additionalResource, create: true, mode: 'tsdb' }];
    case 'downsampled_tsdb_stream':
      return [
        { index: baseStream },
        { index: additionalResource, create: true, mode: 'tsdb', downsample: true },
      ];
  }
};

// Cloud serverless is excluded due to https://github.com/elastic/kibana/issues/195089.
export const logsDBDeploymentTags = [
  ...tags.stateful.classic,
  '@local-serverless-search',
  '@local-serverless-observability_complete',
  '@local-serverless-security_complete',
];

/** Creates shared setup, cleanup, and assertions for one LogsDB scenario spec. */
export const createLogsDBScenario = ({ title, type }: LogsDBScenarioConfig) => {
  const resourceSuffix = `${type}_${process.pid}_${Date.now()}`;
  const baseStream = `kibana_sample_data_lens_logsdb_downgrade_${resourceSuffix}`;
  const additionalResource = `kibana_sample_data_lens_logsdb_additional_${resourceSuffix}`;
  const indexes = getScenarioIndexes(type, baseStream, additionalResource);
  const includesDowngradedStream = indexes.some(({ index }) => index === baseStream);
  let cleanup: (() => Promise<void>) | undefined;

  const setup = async ({
    apiServices,
    kbnClient,
    tsdbHelper,
    uiSettings,
  }: SetupFixtures): Promise<void> => {
    // Registered first so reverse-order cleanup runs the catch-all last.
    const cleanupActions: Array<() => Promise<void>> = [
      async () => kbnClient.savedObjects.cleanStandardList(),
    ];
    cleanup = async () => {
      const actions = [...cleanupActions].reverse();
      cleanupActions.length = 0;
      await runCleanupActions(`LogsDB scenario "${title}"`, actions);
    };

    try {
      if (includesDowngradedStream) {
        const baseStreamHandle = await tsdbHelper.createDowngradedLogsDBStream(
          baseStream,
          TIME_RANGE
        );
        cleanupActions.push(baseStreamHandle.cleanup);
      }

      const scenario = await tsdbHelper.setupScenario(
        baseStream,
        indexes,
        TIME_RANGE.beforeRollover
      );
      cleanupActions.push(scenario.cleanup);

      const { data: dataView } = await apiServices.dataViews.create({
        title: scenario.dataViewTitle,
        timeFieldName: '@timestamp',
      });
      cleanupActions.push(async () => {
        await apiServices.dataViews.delete(dataView.id);
      });
      cleanupActions.push(async () =>
        uiSettings.unset('dateFormat:tz', 'defaultIndex', 'timepicker:timeDefaults')
      );
      await uiSettings.set({
        'dateFormat:tz': 'UTC',
        defaultIndex: dataView.id,
        'timepicker:timeDefaults': JSON.stringify(TIME_RANGE.picker),
      });
    } catch (error) {
      await cleanup();
      cleanup = undefined;
      throw error;
    }
  };

  const cleanupScenario = async (): Promise<void> => {
    await cleanup?.();
    cleanup = undefined;
  };

  const assertTimestampHistogram = async ({ pageObjects }: LensFixtures): Promise<void> => {
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
  };

  const assertDowngradeBoundary = async ({ pageObjects }: LensFixtures): Promise<void> => {
    const { hasDataBeforeDowngrade, hasDataAfterDowngrade } = await getDowngradeBoundaryData({
      pageObjects,
      timeRange: TIME_RANGE,
      configureMetricDimension: async () => {
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'min',
          field: 'bytes',
        });
      },
    });

    expect(hasDataBeforeDowngrade).toBe(true);
    expect(hasDataAfterDowngrade).toBe(true);
  };

  const assertAlternateDateHistogram = async ({ pageObjects }: LensFixtures): Promise<void> => {
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

  const configureAnnotationLayer = async ({ page, pageObjects }: LensFixtures): Promise<void> => {
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
    expect(
      await pageObjects.lens.dimensions.getDimensionTriggerText('lnsXY_xAnnotationsPanel')
    ).toBe('Event');

    await pageObjects.lens.dimensions.openDimensionEditor('lns-dimensionTrigger', 1);
    await page.testSubj.click('lnsXY_annotation_query');
  };

  const assertAnnotation = async (
    timeField: string,
    extraFields: string[],
    { page, pageObjects }: LensFixtures
  ): Promise<void> => {
    await pageObjects.lens.style.configureQueryAnnotation({
      queryString: 'host.name: *',
      timeField,
      textDecoration: { type: 'name' },
      extraFields,
    });
    await pageObjects.lens.closeDimensionEditor();

    await expect(page.testSubj.locator('xyVisGroupedAnnotationIcon')).not.toHaveCount(0);
  };

  const assertTimestampAnnotation = async (fixtures: LensFixtures): Promise<void> => {
    await assertAnnotation('@timestamp', ['host.name', 'utc_time'], fixtures);
  };

  const assertAlternateTimeFieldAnnotation = async (fixtures: LensFixtures): Promise<void> => {
    await assertAnnotation('utc_time', ['host.name', '@timestamp'], fixtures);
  };

  const assertEsqlVisualization = async ({ page, pageObjects }: LensFixtures): Promise<void> => {
    await pageObjects.discover.goto({ queryMode: 'esql' });
    const esqlQuery = `from ${indexes
      .map(({ index }) => index)
      .join(', ')} | stats averageB = avg(bytes) by extension`;
    await pageObjects.discover.writeAndSubmitEsqlQuery(esqlQuery);
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.openLensEditFlyout();

    await expect(
      page.testSubj.locator('lnsXY_yDimensionPanel > lns-dimensionTrigger-textBased')
    ).toHaveText('averageB');
  };

  return {
    setup,
    cleanup: cleanupScenario,
    assertTimestampHistogram,
    assertDowngradeBoundary,
    assertAlternateDateHistogram,
    configureAnnotationLayer,
    assertTimestampAnnotation,
    assertAlternateTimeFieldAnnotation,
    assertEsqlVisualization,
  };
};
