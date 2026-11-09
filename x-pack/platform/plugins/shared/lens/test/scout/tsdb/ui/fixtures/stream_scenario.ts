/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import moment from 'moment';
import { expect } from '@kbn/scout/ui';
import type { TsdbScenarioContext, TsdbScenarioIndex, TsdbScenarioTimeRange } from './tsdb_helpers';
import type { StreamChartBar } from './stream_chart_helpers';
import {
  TSDB_SCENARIO_DOCUMENT_COUNT,
  createTsdbScenarioTimeRange,
  createTsdbStreamScenario,
  getDowngradeBoundaryData,
} from './tsdb_helpers';
import {
  getCountBars,
  getIncompatibleAverageCount,
  getUpgradeBoundarySeries,
} from './stream_chart_helpers';

type StreamScenarioVariant =
  | 'base_stream'
  | 'regular_index'
  | 'downsampled_tsdb_stream'
  | 'regular_and_downsampled'
  | 'additional_tsdb_stream';

type ChartFixtures = Pick<TsdbScenarioContext, 'pageObjects'>;

const assertDocumentCounts = (
  bars: StreamChartBar[],
  expectedDocumentCountBeforeRollover: number,
  timeRange: TsdbScenarioTimeRange
): void => {
  expect.soft(bars.filter(({ y }) => y > 0).map(({ x, y }) => ({ x, y }))).toStrictEqual([
    { x: Date.parse(timeRange.beforeRollover), y: expectedDocumentCountBeforeRollover },
    { x: Date.parse(timeRange.afterRollover), y: TSDB_SCENARIO_DOCUMENT_COUNT },
  ]);
};

/** Creates isolated resources and shared assertions for one TSDB stream scenario spec. */
export const createStreamScenario = ({
  direction,
  variant,
}: {
  direction: 'upgrade' | 'downgrade';
  variant: StreamScenarioVariant;
}) => {
  const resourceSuffix = randomUUID();
  // Serverless Security's editor role grants data access to the sample-data namespace.
  const baseStream = `kibana_sample_data_lens_tsdb_${direction}_${resourceSuffix}`;
  const indexes: TsdbScenarioIndex[] = [{ index: baseStream }];
  if (variant === 'regular_index' || variant === 'regular_and_downsampled') {
    indexes.push({
      index: `kibana_sample_data_lens_tsdb_regular_${resourceSuffix}`,
      create: true,
      removeTSDBFields: true,
    });
  }
  if (
    variant === 'additional_tsdb_stream' ||
    variant === 'downsampled_tsdb_stream' ||
    variant === 'regular_and_downsampled'
  ) {
    indexes.push({
      index: `kibana_sample_data_lens_tsdb_additional_${resourceSuffix}`,
      create: true,
      mode: 'tsdb',
      downsample: variant !== 'additional_tsdb_stream',
    });
  }
  // Keep timestamps recent for TSDB while aligning raw and downsampled data to hourly buckets.
  const timeRange = createTsdbScenarioTimeRange(moment.utc().startOf('hour').valueOf());
  // The data view queries both the original stream and its separate downsample target.
  const expectedBeforeCount =
    (indexes.length + indexes.filter(({ downsample }) => downsample).length) *
    TSDB_SCENARIO_DOCUMENT_COUNT;
  const scenario = createTsdbStreamScenario({
    baseStream,
    baseStreamKind: direction === 'upgrade' ? 'upgraded' : 'downgraded',
    indexes,
    timeRange,
  });

  const assertAverageCompatibility = async (fixtures: TsdbScenarioContext): Promise<void> => {
    // Mixed backing-index mappings expose the counter as a plain numeric field,
    // keeping Average enabled even with an additional pure TSDB stream.
    expect(await getIncompatibleAverageCount(fixtures)).toBe(0);
  };

  const assertDowngradeCounts = async (fixtures: ChartFixtures): Promise<void> => {
    const bars = await getCountBars(fixtures, timeRange);
    expect(bars.length).toBeGreaterThan(0);
    assertDocumentCounts(bars, expectedBeforeCount, timeRange);
  };

  const assertDowngradeBoundary = async ({ pageObjects }: ChartFixtures): Promise<void> => {
    const { hasDataBeforeDowngrade, hasDataAfterDowngrade } = await getDowngradeBoundaryData({
      pageObjects,
      timeRange,
      configureMetricDimension: async () => {
        await pageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'count',
        });
      },
    });
    expect.soft(hasDataBeforeDowngrade).toBe(true);
    expect.soft(hasDataAfterDowngrade).toBe(true);
  };

  const assertUpgradeBoundary = async (fixtures: ChartFixtures): Promise<void> => {
    const { counterBars, countBars } = await getUpgradeBoundarySeries(fixtures, timeRange);
    expect(counterBars.length).toBeGreaterThan(0);
    expect(countBars.length).toBeGreaterThan(0);
    expect.soft(counterBars[0]?.y).toBe(5000);
    expect.soft(counterBars[counterBars.length - 1]?.y).toBe(5000);
    assertDocumentCounts(countBars, expectedBeforeCount, timeRange);
  };

  return {
    setup: scenario.setup,
    cleanup: scenario.cleanup,
    assertAverageCompatibility,
    assertDowngradeCounts,
    assertDowngradeBoundary,
    assertUpgradeBoundary,
  };
};
