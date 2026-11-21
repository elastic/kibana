/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TsdbScenarioContext, TsdbScenarioTimeRange } from './tsdb_helpers';
import { offsetPickerTime } from './tsdb_helpers';

export interface StreamChartBar {
  x: number;
  y: number;
}

export const getIncompatibleAverageCount = async ({
  page,
  pageObjects,
}: TsdbScenarioContext): Promise<number> => {
  await pageObjects.lens.workspace.openFullEditor();
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
};

export const getCountBars = async (
  { pageObjects }: Pick<TsdbScenarioContext, 'pageObjects'>,
  timeRange: TsdbScenarioTimeRange
): Promise<StreamChartBar[]> => {
  await pageObjects.lens.workspace.openFullEditor();
  await pageObjects.datePicker.setAbsoluteRange({
    from: offsetPickerTime(timeRange.picker.from, 0),
    to: offsetPickerTime(timeRange.picker.to, 0),
  });
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
    operation: 'date_histogram',
    field: '@timestamp',
    keepOpen: true,
  });

  await pageObjects.lens.dimensions.setDateHistogramInterval('Hour');

  // Bar charts disable empty rows by default. Keep empty buckets so the first and last bars cover
  // the complete range before and after the stream rollover.
  await pageObjects.lens.dimensions.enableIncludeEmptyRows();
  await pageObjects.lens.closeDimensionEditor();

  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
    operation: 'count',
  });

  await pageObjects.lens.waitForVisualization('xyVisChart');
  const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
  return chartData.bars?.[0]?.bars ?? [];
};

export const getUpgradeBoundarySeries = async (
  { pageObjects }: Pick<TsdbScenarioContext, 'pageObjects'>,
  timeRange: TsdbScenarioTimeRange
): Promise<{
  counterBars: StreamChartBar[];
  countBars: StreamChartBar[];
}> => {
  await pageObjects.lens.workspace.openFullEditor();
  await pageObjects.datePicker.setAbsoluteRange({
    from: offsetPickerTime(timeRange.picker.from, 0),
    to: offsetPickerTime(timeRange.picker.to, 0),
  });
  await pageObjects.lens.configureDimension({
    dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
    operation: 'date_histogram',
    field: '@timestamp',
    keepOpen: true,
  });

  await pageObjects.lens.dimensions.setDateHistogramInterval('Hour');

  // Bar charts disable empty rows by default. Keep empty buckets so the first and last bars
  // cover the complete range before and after the stream rollover.
  await pageObjects.lens.dimensions.enableIncludeEmptyRows();
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
  const chartData = await pageObjects.lens.workspace.getCurrentChartDebugState('xyVisChart');
  return {
    counterBars: chartData.bars?.[0]?.bars ?? [],
    countBars: chartData.bars?.[1]?.bars ?? [],
  };
};
