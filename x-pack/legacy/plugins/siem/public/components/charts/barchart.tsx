/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Chart, BarSeries, Axis, Position, ScaleType, Settings } from '@elastic/charts';
import { getOr, get, isNumber } from 'lodash/fp';
import deepmerge from 'deepmerge';
import useResizeObserver from 'use-resize-observer';

import { useTimeZone } from '../../lib/kibana';
import { ChartPlaceHolder } from './chart_place_holder';
import {
  chartDefaultSettings,
  ChartSeriesConfigs,
  ChartSeriesData,
  checkIfAllValuesAreZero,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  useTheme,
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
export const BarChartBaseComponent = ({
  data,
  ...chartConfigs
}: {
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}) => {
  const theme = useTheme();
  const timeZone = useTimeZone();
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const tickSize = getOr(0, 'configs.axis.tickSize', chartConfigs);
  const xAxisId = `stat-items-barchart-${data[0].key}-x`;
  const yAxisId = `stat-items-barchart-${data[0].key}-y`;
  const settings = {
    ...chartDefaultSettings,
    ...deepmerge(get('configs.settings', chartConfigs), { theme }),
  };

  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings {...settings} />
      {data.map(series => {
        const barSeriesKey = series.key;
        return checkIfAllTheDataInTheSeriesAreValid ? (
          <BarSeries
            id={barSeriesKey}
            key={barSeriesKey}
            name={series.key}
            xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
            yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
            xAccessor="x"
            yAccessors={['y']}
            timeZone={timeZone}
            splitSeriesAccessors={['g']}
            data={series.value!}
            stackAccessors={get('configs.series.stackAccessors', chartConfigs)}
            customSeriesColors={series.color ? [series.color] : undefined}
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
};

BarChartBaseComponent.displayName = 'BarChartBaseComponent';

export const BarChartBase = React.memo(BarChartBaseComponent);

BarChartBase.displayName = 'BarChartBase';

interface BarChartComponentProps {
  barChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({ barChart, configs }) => {
  const { ref: measureRef, width, height } = useResizeObserver<HTMLDivElement>({});
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  const chartHeight = getChartHeight(customHeight, height);
  const chartWidth = getChartWidth(customWidth, width);

  return checkIfAnyValidSeriesExist(barChart) ? (
    <WrappedByAutoSizer ref={measureRef} height={chartHeight}>
      <BarChartBase height={chartHeight} width={chartHeight} data={barChart} configs={configs} />
    </WrappedByAutoSizer>
  ) : (
    <ChartPlaceHolder height={chartHeight} width={chartWidth} data={barChart} />
  );
};

export const BarChart = React.memo(BarChartComponent);
