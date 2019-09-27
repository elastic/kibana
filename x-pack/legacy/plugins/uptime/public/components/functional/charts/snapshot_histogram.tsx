/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  getAxisId,
  getSpecId,
  Position,
  timeFormatter,
  Settings,
} from '@elastic/charts';
import { EuiEmptyPrompt, EuiTitle, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { HistogramDataPoint } from '../../../../common/graphql/types';
import { getColorsMap } from './get_colors_map';
import { getChartDateLabel } from '../../../lib/helper';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { snapshotHistogramQuery } from '../../../queries/snapshot_histogram_query';
import { ChartWrapper } from './chart_wrapper';
import { UptimeSettingsContext } from '../../../contexts';

export interface SnapshotHistogramProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;

  /**
   * Height is needed, since by defauly charts takes height of 100%
   */
  height?: string;
}

interface SnapshotHistogramQueryResult {
  histogram?: HistogramDataPoint[];
}

type Props = UptimeGraphQLQueryProps<SnapshotHistogramQueryResult> & SnapshotHistogramProps;

export const SnapshotHistogramComponent = ({
  absoluteStartDate,
  absoluteEndDate,
  data,
  loading = false,
  height,
}: Props) => {
  if (!data || !data.histogram)
    /**
     * TODO: the Fragment, EuiTitle, and EuiPanel should be extractec to a dumb component
     * that we can reuse in the subsequent return statement at the bottom of this function.
     */
    return (
      <Fragment>
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
      </Fragment>
    );
  const { histogram } = data;
  const downMonitorsName = i18n.translate('xpack.uptime.snapshotHistogram.downMonitorsId', {
    defaultMessage: 'Down Monitors',
  });

  const { colors } = useContext(UptimeSettingsContext);

  const downSpecId = getSpecId(downMonitorsName);

  const upMonitorsId = i18n.translate('xpack.uptime.snapshotHistogram.series.upLabel', {
    defaultMessage: 'Up',
  });
  const upSpecId = getSpecId(upMonitorsId);
  return (
    <Fragment>
      <EuiPanel paddingSize="m">
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.pingsOverTimeTitle"
              defaultMessage="Pings over time"
            />
          </h5>
        </EuiTitle>
        <ChartWrapper height={height} loading={loading}>
          <Chart>
            <Settings
              xDomain={{ min: absoluteStartDate, max: absoluteEndDate }}
              showLegend={false}
            />
            <Axis
              id={getAxisId(
                i18n.translate('xpack.uptime.snapshotHistogram.xAxisId', {
                  defaultMessage: 'Snapshot X Axis',
                })
              )}
              position={Position.Bottom}
              showOverlappingTicks={false}
              tickFormat={timeFormatter(getChartDateLabel(absoluteStartDate, absoluteEndDate))}
            />
            <Axis
              id={getAxisId(
                i18n.translate('xpack.uptime.snapshotHistogram.yAxisId', {
                  defaultMessage: 'Snapshot Y Axis',
                })
              )}
              position="left"
              title={i18n.translate('xpack.uptime.snapshotHistogram.yAxis.title', {
                defaultMessage: 'Pings',
                description:
                  'The label on the y-axis of a chart that displays the number of times Heartbeat has pinged a set of services/websites.',
              })}
            />
            <BarSeries
              customSeriesColors={getColorsMap(colors.danger, downSpecId)}
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
              customSeriesColors={getColorsMap(colors.gray, upSpecId)}
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
      </EuiPanel>
    </Fragment>
  );
};

export const SnapshotHistogram = withUptimeGraphQL<
  SnapshotHistogramQueryResult,
  SnapshotHistogramProps
>(SnapshotHistogramComponent, snapshotHistogramQuery);
