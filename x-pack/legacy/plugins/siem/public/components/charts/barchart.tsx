/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  Chart,
  BarSeries,
  Axis,
  Position,
  getAxisId,
  getSpecId,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { getOr, get } from 'lodash/fp';
import {
  ChartSeriesData,
  WrappedByAutoSizer,
  ChartHolder,
  SeriesType,
  getSeriesStyle,
  ChartSeriesConfigs,
  browserTimezone,
  chartDefaultSettings,
  getChartHeight,
  getChartWidth,
} from './common';
import { AutoSizer } from '../auto_sizer';

// Bar chart rotation: https://ela.st/chart-rotations
export const BarChartBaseComponent = React.memo<{
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, ...chartConfigs }) => {
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const tickSize = getOr(0, 'configs.axis.tickSize', chartConfigs);
  const xAxisId = getAxisId(`stat-items-barchart-${data[0].key}-x`);
  const yAxisId = getAxisId(`stat-items-barchart-${data[0].key}-y`);
  const settings = {
    ...chartDefaultSettings,
    ...get('configs.settings', chartConfigs),
  };
  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings {...settings} />
      {data.map(series => {
        const barSeriesKey = series.key;
        const barSeriesSpecId = getSpecId(barSeriesKey);
        const seriesType = SeriesType.BAR;
        return (
          <BarSeries
            id={barSeriesSpecId}
            key={barSeriesKey}
            name={series.key}
            xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
            yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
            xAccessor="x"
            yAccessors={['y']}
            timeZone={browserTimezone}
            splitSeriesAccessors={['g']}
            data={series.value!}
            stackAccessors={get('configs.series.stackAccessors', chartConfigs)}
            customSeriesColors={getSeriesStyle(barSeriesKey, series.color, seriesType)}
          />
        );
      })}

      <Axis
        id={xAxisId}
        position={Position.Bottom}
        showOverlappingTicks={false}
        tickSize={tickSize}
        tickFormat={xTickFormatter}
      />

      <Axis id={yAxisId} position={Position.Left} tickSize={tickSize} tickFormat={yTickFormatter} />
    </Chart>
  ) : null;
});

BarChartBaseComponent.displayName = 'BarChartBaseComponent';

export const BarChartWithCustomPrompt = React.memo<{
  data: ChartSeriesData[] | null | undefined;
  height: string | null | undefined;
  width: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, height, width, configs }) => {
  return data &&
    data.length &&
    data.some(
      ({ value }) =>
        value != null && value.length > 0 && value.every(chart => chart.y != null && chart.y >= 0)
    ) ? (
    <BarChartBaseComponent height={height} width={width} data={data} configs={configs} />
  ) : (
    <ChartHolder height={height} width={width} />
  );
});

BarChartWithCustomPrompt.displayName = 'BarChartWithCustomPrompt';

export const BarChart = React.memo<{
  barChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ barChart, configs }) => {
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  return get(`0.value.length`, barChart) ? (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef} height={getChartHeight(customHeight, height)}>
          <BarChartWithCustomPrompt
            height={getChartHeight(customHeight, height)}
            width={getChartWidth(customWidth, width)}
            data={barChart}
            configs={configs}
          />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  ) : (
    <ChartHolder height={getChartHeight(customHeight)} width={getChartWidth(customWidth)} />
  );
});

BarChart.displayName = 'BarChart';
