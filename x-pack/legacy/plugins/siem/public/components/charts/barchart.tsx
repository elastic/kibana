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
import { getOr, get, isNumber } from 'lodash/fp';
import { AutoSizer } from '../auto_sizer';
import { ChartPlaceHolder } from './chart_place_holder';
import {
  browserTimezone,
  chartDefaultSettings,
  ChartSeriesConfigs,
  ChartSeriesData,
  checkIfAllValuesAreZero,
  getSeriesStyle,
  getChartHeight,
  getChartWidth,
  SeriesType,
  WrappedByAutoSizer,
} from './common';

const checkIfAllTheDataInTheSeriesAreValid = (series: ChartSeriesData): series is ChartSeriesData =>
  series != null &&
  !!get('value.length', series) &&
  (series.value || []).every(({ x, y }) => isNumber(y) && y >= 0);

const checkIfAnyValidSeriesExist = (
  data: ChartSeriesData[] | null | undefined
): data is ChartSeriesData[] =>
  Array.isArray(data) &&
  !checkIfAllValuesAreZero(data) &&
  data.some(checkIfAllTheDataInTheSeriesAreValid);

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
        return checkIfAllTheDataInTheSeriesAreValid ? (
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
        ) : null;
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

export const BarChart = React.memo<{
  barChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ barChart, configs }) => {
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  return checkIfAnyValidSeriesExist(barChart) ? (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer ref={measureRef} height={getChartHeight(customHeight, height)}>
          <BarChartBaseComponent
            height={getChartHeight(customHeight, height)}
            width={getChartWidth(customWidth, width)}
            data={barChart}
            configs={configs}
          />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  ) : (
    <ChartPlaceHolder
      height={getChartHeight(customHeight)}
      width={getChartWidth(customWidth)}
      data={barChart}
    />
  );
});

BarChart.displayName = 'BarChart';
