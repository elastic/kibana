/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Chart, BarSeries, Axis, Position, getSpecId, ScaleType, Settings } from '@elastic/charts';
import { getAxisId } from '@elastic/charts';
import { getOr, get } from 'lodash/fp';
import {
  ChartConfigsData,
  WrappedByAutoSizer,
  ChartHolder,
  SeriesType,
  getSeriesStyle,
  getTheme,
  ChartSeriesConfigs,
  browserTimezone,
  chartDefaultSettings,
} from './common';
import { AutoSizer } from '../auto_sizer';

// Bar chart rotation: https://ela.st/chart-rotations
export const BarChartBaseComponent = React.memo<{
  data: ChartConfigsData[];
  width: number | null | undefined;
  height: number | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, ...chartConfigs }) => {
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const xAxisId = getAxisId(`stat-items-barchart-${data[0].key}-x`);
  const yAxisId = getAxisId(`stat-items-barchart-${data[0].key}-y`);
  const settings = {
    ...chartDefaultSettings,
    ...get('configs.settings', chartConfigs),
  };
  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings {...settings} theme={getTheme()} />
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
            stackAccessors={['y']}
            customSeriesColors={getSeriesStyle(barSeriesKey, series.color, seriesType)}
          />
        );
      })}

      {xTickFormatter ? (
        <Axis
          id={xAxisId}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickSize={0}
          tickFormat={xTickFormatter}
        />
      ) : (
        <Axis id={xAxisId} position={Position.Bottom} showOverlappingTicks={false} tickSize={0} />
      )}

      {yTickFormatter ? (
        <Axis id={yAxisId} position={Position.Left} tickSize={0} tickFormat={yTickFormatter} />
      ) : (
        <Axis id={yAxisId} position={Position.Left} tickSize={0} />
      )}
    </Chart>
  ) : null;
});

export const BarChartWithCustomPrompt = React.memo<{
  data: ChartConfigsData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, height, width, configs }) => {
  return data &&
    data.length &&
    data.some(
      ({ value }) =>
        value != null && value.length > 0 && value.every(chart => chart.y != null && chart.y > 0)
    ) ? (
    <BarChartBaseComponent height={height} width={width} data={data} configs={configs} />
  ) : (
    <ChartHolder />
  );
});

export const BarChart = React.memo<{
  barChart: ChartConfigsData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ barChart, configs }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer innerRef={measureRef}>
        <BarChartWithCustomPrompt height={height} width={width} data={barChart} configs={configs} />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));
