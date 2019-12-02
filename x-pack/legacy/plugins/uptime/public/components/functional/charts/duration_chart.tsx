/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, Chart, Position, timeFormatter, Settings } from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { getChartDateLabel } from '../../../lib/helper';
import { LocationDurationLine } from '../../../../common/graphql/types';
import { DurationLineSeriesList } from './duration_line_series_list';
import { DurationChartEmptyState } from './duration_chart_empty_state';
import { ChartWrapper } from './chart_wrapper';
import { useUrlParams } from '../../../hooks';
import { getTickFormat } from './get_tick_format';

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
  const hasLines = locationDurationLines.length > 0;
  const [getUrlParams] = useUrlParams();
  const { absoluteDateRangeStart: min, absoluteDateRangeEnd: max } = getUrlParams();

  return (
    <>
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
            <Settings xDomain={{ min, max }} showLegend={true} legendPosition={Position.Bottom} />
            <Axis
              id="bottom"
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={timeFormatter(getChartDateLabel(min, max))}
              title={i18n.translate('xpack.uptime.monitorCharts.durationChart.bottomAxis.title', {
                defaultMessage: 'Timestamp',
              })}
            />
            <Axis
              domain={{ min: 0 }}
              id="left"
              position={Position.Left}
              tickFormat={d => getTickFormat(d)}
              title={i18n.translate('xpack.uptime.monitorCharts.durationChart.leftAxis.title', {
                defaultMessage: 'Duration ms',
              })}
            />
            {hasLines ? (
              <DurationLineSeriesList lines={locationDurationLines} meanColor={meanColor} />
            ) : (
              <DurationChartEmptyState />
            )}
          </Chart>
        </ChartWrapper>
      </EuiPanel>
    </>
  );
};
