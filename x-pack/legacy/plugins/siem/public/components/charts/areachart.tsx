/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  Axis,
  AreaSeries,
  Chart,
  getAxisId,
  getSpecId,
  Position,
  ScaleType,
  Settings,
  AreaSeriesStyle,
  RecursivePartial,
} from '@elastic/charts';
import { getOr, get, isNull, isNumber } from 'lodash/fp';
import { AutoSizer } from '../auto_sizer';
import { ChartPlaceHolder } from './chart_place_holder';
import {
  browserTimezone,
  chartDefaultSettings,
  ChartSeriesConfigs,
  ChartSeriesData,
  getChartHeight,
  getChartWidth,
  getSeriesStyle,
  WrappedByAutoSizer,
} from './common';

// custom series styles: https://ela.st/areachart-styling
const getSeriesLineStyle = (): RecursivePartial<AreaSeriesStyle> => {
  return {
    area: {
      opacity: 0.04,
      visible: true,
    },
    line: {
      strokeWidth: 1,
      visible: true,
    },
    point: {
      visible: false,
      radius: 0.2,
      strokeWidth: 1,
      opacity: 1,
    },
  };
};

const checkIfAllTheDataInTheSeriesAreValid = (series: unknown): series is ChartSeriesData =>
  !!get('value.length', series) &&
  get('value', series).every(
    ({ x, y }: { x: unknown; y: unknown }) => !isNull(x) && isNumber(y) && y > 0
  );

const checkIfAnyValidSeriesExist = (
  data: ChartSeriesData[] | null | undefined
): data is ChartSeriesData[] =>
  Array.isArray(data) && data.some(checkIfAllTheDataInTheSeriesAreValid);

// https://ela.st/multi-areaseries
export const AreaChartBaseComponent = React.memo<{
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ data, ...chartConfigs }) => {
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const xAxisId = getAxisId(`group-${data[0].key}-x`);
  const yAxisId = getAxisId(`group-${data[0].key}-y`);
  const settings = {
    ...chartDefaultSettings,
    ...get('configs.settings', chartConfigs),
  };
  return chartConfigs.width && chartConfigs.height ? (
    <div style={{ height: chartConfigs.height, width: chartConfigs.width, position: 'relative' }}>
      <Chart>
        <Settings {...settings} />
        {data.map(series => {
          const seriesKey = series.key;
          const seriesSpecId = getSpecId(seriesKey);
          return checkIfAllTheDataInTheSeriesAreValid(series) ? (
            <AreaSeries
              id={seriesSpecId}
              key={seriesKey}
              name={series.key.replace('Histogram', '')}
              data={series.value || undefined}
              xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
              yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
              timeZone={browserTimezone}
              xAccessor="x"
              yAccessors={['y']}
              areaSeriesStyle={getSeriesLineStyle()}
              customSeriesColors={getSeriesStyle(seriesKey, series.color)}
            />
          ) : null;
        })}

        <Axis
          id={xAxisId}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickFormat={xTickFormatter}
          tickSize={0}
        />

        <Axis id={yAxisId} position={Position.Left} tickSize={0} tickFormat={yTickFormatter} />
      </Chart>
    </div>
  ) : null;
});

AreaChartBaseComponent.displayName = 'AreaChartBaseComponent';

export const AreaChart = React.memo<{
  areaChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}>(({ areaChart, configs }) => {
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);

  return checkIfAnyValidSeriesExist(areaChart) ? (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef} height={getChartHeight(customHeight, height)}>
          <AreaChartBaseComponent
            data={areaChart}
            height={getChartHeight(customHeight, height)}
            width={getChartWidth(customWidth, width)}
            configs={configs}
          />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  ) : (
    <ChartPlaceHolder
      height={getChartHeight(customHeight)}
      width={getChartWidth(customWidth)}
      data={areaChart}
    />
  );
});

AreaChart.displayName = 'AreaChart';
