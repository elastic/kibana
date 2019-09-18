/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  CurveType,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  timeFormatter,
  Settings,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  convertMicrosecondsToMilliseconds as microsToMillis,
  getChartDateLabel,
} from '../../../lib/helper';
import { LocationDurationLine } from '../../../../common/graphql/types';
import { getColorsMap } from './get_colors_map';
import { ChartWrapper } from './chart_wrapper';
import { useUrlParams } from '../../../hooks';

interface DurationChartProps {
  /**
   * Timeseries data that is used to express an average line series
   * on the duration chart. One entry per location
   */
  locationDurationLines: LocationDurationLine[];
  /**
   * The color to be used for the average duration series.
   */
  meanColor: string;
  /**
   * The color to be used for the range duration series.
   */
  rangeColor: string;

  /**
   * To represent the loading spinner on chart
   */
  loading: boolean;
}

/**
 * This chart is intended to visualize monitor duration performance over time to
 * the users in a helpful way. Its x-axis is based on a timeseries, the y-axis is in
 * milliseconds.
 * @param props The props required for this component to render properly
 */
export const DurationChart = ({
  locationDurationLines,
  meanColor,
  loading,
}: DurationChartProps) => {
  const [getUrlParams] = useUrlParams();
  const { absoluteDateRangeStart, absoluteDateRangeEnd } = getUrlParams();
  // this id is used for the line chart representing the average duration length
  const averageSpecId = getSpecId('average-');

  const lineSeries = locationDurationLines.map(line => {
    const locationSpecId = getSpecId('loc-avg' + line.name);
    return (
      <LineSeries
        curve={CurveType.CURVE_MONOTONE_X}
        customSeriesColors={getColorsMap(meanColor, averageSpecId)}
        data={line.line.map(({ x, y }) => [x || 0, microsToMillis(y)])}
        id={locationSpecId}
        key={`locline-${line.name}`}
        name={line.name}
        xAccessor={0}
        xScaleType={ScaleType.Time}
        yAccessors={[1]}
        yScaleToDataExtent={false}
        yScaleType={ScaleType.Linear}
      />
    );
  });

  return (
    <React.Fragment>
      <EuiPanel paddingSize="m">
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.uptime.monitorCharts.monitorDuration.titleLabel"
              defaultMessage="Monitor duration"
              description="The 'ms' is an abbreviation for milliseconds."
            />
          </h4>
        </EuiTitle>
        <ChartWrapper height="400px" loading={loading}>
          <Chart>
            <Settings
              xDomain={{ min: absoluteDateRangeStart, max: absoluteDateRangeEnd }}
              showLegend={true}
              legendPosition={Position.Bottom}
            />
            <Axis
              id={getAxisId('bottom')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={timeFormatter(
                getChartDateLabel(absoluteDateRangeStart, absoluteDateRangeEnd)
              )}
              title={i18n.translate('xpack.uptime.monitorCharts.durationChart.bottomAxis.title', {
                defaultMessage: 'Timestamp',
              })}
            />
            <Axis
              domain={{ min: 0 }}
              id={getAxisId('left')}
              position={Position.Left}
              tickFormat={d => Number(d).toFixed(0)}
              title={i18n.translate('xpack.uptime.monitorCharts.durationChart.leftAxis.title', {
                defaultMessage: 'Duration ms',
              })}
            />
            {lineSeries}
          </Chart>
        </ChartWrapper>
      </EuiPanel>
    </React.Fragment>
  );
};
