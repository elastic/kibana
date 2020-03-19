/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, BarSeries, Chart, Position, Settings, timeFormatter } from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import { getChartDateLabel } from '../../../lib/helper';
import { ChartWrapper } from './chart_wrapper';
import { UptimeThemeContext } from '../../../contexts';
import { HistogramResult } from '../../../../common/types';
import { useUrlParams } from '../../../hooks';
import { ChartEmptyState } from './chart_empty_state';

export interface PingHistogramComponentProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;

  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;

  data: HistogramResult | null;

  loading?: boolean;
}

export const PingHistogramComponent: React.FC<PingHistogramComponentProps> = ({
  absoluteStartDate,
  absoluteEndDate,
  data,
  loading = false,
  height,
}) => {
  const {
    colors: { danger, gray },
  } = useContext(UptimeThemeContext);

  const [, updateUrlParams] = useUrlParams();

  let content: JSX.Element | undefined;
  if (!data?.histogram?.length) {
    content = (
      <ChartEmptyState
        title={i18n.translate('xpack.uptime.snapshot.noDataTitle', {
          defaultMessage: 'No ping data available',
        })}
        body={i18n.translate('xpack.uptime.snapshot.noDataDescription', {
          defaultMessage: 'There are no pings in the selected time range.',
        })}
      />
    );
  } else {
    const { histogram } = data;

    const downSpecId = i18n.translate('xpack.uptime.snapshotHistogram.downMonitorsId', {
      defaultMessage: 'Down Monitors',
    });

    const upMonitorsId = i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
      defaultMessage: 'Up',
    });

    const onBrushEnd = (min: number, max: number) => {
      updateUrlParams({
        dateRangeStart: moment(min).toISOString(),
        dateRangeEnd: moment(max).toISOString(),
      });
    };
    content = (
      <ChartWrapper
        height={height}
        loading={loading}
        aria-label={i18n.translate('xpack.uptime.snapshotHistogram.description', {
          defaultMessage:
            'Bar Chart showing uptime status over time from {startTime} to {endTime}.',
          values: {
            startTime: moment(new Date(absoluteStartDate).valueOf()).fromNow(),
            endTime: moment(new Date(absoluteEndDate).valueOf()).fromNow(),
          },
        })}
      >
        <Chart>
          <Settings
            xDomain={{
              min: absoluteStartDate,
              max: absoluteEndDate,
            }}
            showLegend={false}
            onBrushEnd={onBrushEnd}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Ping X Axis',
            })}
            position={Position.Bottom}
            showOverlappingTicks={false}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
              defaultMessage: 'Ping Y Axis',
            })}
            position="left"
            title={i18n.translate('xpack.uptime.snapshotHistogram.yAxis.title', {
              defaultMessage: 'Pings',
              description:
                'The label on the y-axis of a chart that displays the number of times Heartbeat has pinged a set of services/websites.',
            })}
          />

          <BarSeries
            customSeriesColors={[danger]}
            data={histogram.map(({ x, downCount }) => [x, downCount || 0])}
            id={downSpecId}
            name={i18n.translate('xpack.uptime.snapshotHistogram.series.downLabel', {
              defaultMessage: 'Down',
            })}
            stackAccessors={[0]}
            timeZone="local"
            xAccessor={0}
            xScaleType="time"
            yAccessors={[1]}
            yScaleType="linear"
          />
          <BarSeries
            customSeriesColors={[gray]}
            data={histogram.map(({ x, upCount }) => [x, upCount || 0])}
            id={upMonitorsId}
            name={upMonitorsId}
            stackAccessors={[0]}
            timeZone="local"
            xAccessor={0}
            xScaleType="time"
            yAccessors={[1]}
            yScaleType="linear"
          />
        </Chart>
      </ChartWrapper>
    );
  }

  return (
    <>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.uptime.snapshot.pingsOverTimeTitle"
            defaultMessage="Pings over time"
          />
        </h2>
      </EuiTitle>
      {content}
    </>
  );
};
