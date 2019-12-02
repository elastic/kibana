/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, BarSeries, Chart, Position, timeFormatter, Settings } from '@elastic/charts';
import { EuiEmptyPrompt, EuiTitle, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel } from '../../../lib/helper';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { snapshotHistogramQuery } from '../../../queries/snapshot_histogram_query';
import { ChartWrapper } from './chart_wrapper';
import { UptimeSettingsContext } from '../../../contexts';
import { ResponsiveWrapperProps, withResponsiveWrapper } from '../../higher_order';
import { HistogramResult } from '../../../../common/domain_types';

interface HistogramProps {
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
}

export type SnapshotHistogramProps = HistogramProps & ResponsiveWrapperProps;

interface SnapshotHistogramQueryResult {
  queryResult?: HistogramResult;
}

type Props = UptimeGraphQLQueryProps<SnapshotHistogramQueryResult> &
  SnapshotHistogramProps &
  ResponsiveWrapperProps;

export const SnapshotHistogramComponent: React.FC<Props> = ({
  absoluteStartDate,
  absoluteEndDate,
  data,
  loading = false,
  height,
}: Props) => {
  if (!data || !data.queryResult)
    /**
     * TODO: the Fragment, EuiTitle, and EuiPanel should be extracted to a dumb component
     * that we can reuse in the subsequent return statement at the bottom of this function.
     */
    return (
      <>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.pingsOverTimeTitle"
              defaultMessage="Pings over time"
            />
          </h5>
        </EuiTitle>
        <EuiPanel paddingSize="s" style={{ height: 170 }}>
          <EuiEmptyPrompt
            title={
              <EuiTitle>
                <h5>
                  <FormattedMessage
                    id="xpack.uptime.snapshot.noDataTitle"
                    defaultMessage="No histogram data available"
                  />
                </h5>
              </EuiTitle>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.uptime.snapshot.noDataDescription"
                  defaultMessage="Sorry, there is no data available for the histogram"
                />
              </p>
            }
          />
        </EuiPanel>
      </>
    );
  const {
    queryResult: { histogram, interval },
  } = data;

  const {
    colors: { danger, gray },
  } = useContext(UptimeSettingsContext);

  const downMonitorsId = i18n.translate('xpack.uptime.snapshotHistogram.downMonitorsId', {
    defaultMessage: 'Down Monitors',
  });
  const downSpecId = downMonitorsId;

  const upMonitorsId = i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
    defaultMessage: 'Up',
  });
  const upSpecId = upMonitorsId;
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
              minInterval: interval,
              min: absoluteStartDate,
              max: absoluteEndDate,
            }}
            showLegend={false}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
              defaultMessage: 'Snapshot X Axis',
            })}
            position={Position.Bottom}
            showOverlappingTicks={false}
            tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
          />
          <Axis
            id={i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
              defaultMessage: 'Snapshot Y Axis',
            })}
            position="left"
            title={i18n.translate('xpack.uptime.snapshotHistogram.yAxis.title', {
              defaultMessage: 'Pings',
              description:
                'The label on the y-axis of a chart that displays the number of times Heartbeat has pinged a set of services/websites.',
            })}
          />
          <BarSeries
            customSeriesColors={getColorsMap(danger, downSpecId)}
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
            customSeriesColors={getColorsMap(gray, upSpecId)}
            data={histogram.map(({ x, upCount }) => [x, upCount || 0])}
            id={upSpecId}
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
    </>
  );
};

export const SnapshotHistogram = withUptimeGraphQL<
  SnapshotHistogramQueryResult,
  SnapshotHistogramProps
>(withResponsiveWrapper<Props>(SnapshotHistogramComponent), snapshotHistogramQuery);
