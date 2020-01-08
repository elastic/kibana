/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { MonitorChart } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorChartsQuery } from '../../queries';
import { DurationChart } from './charts';
import { SnapshotHistogram } from './charts/snapshot_histogram';
import { useUrlParams } from '../../hooks';

interface MonitorChartsQueryResult {
  monitorChartsData?: MonitorChart;
}

interface MonitorChartsProps {
  monitorId: string;
  danger: string;
  mean: string;
  range: string;
  success: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

type Props = MonitorChartsProps & UptimeGraphQLQueryProps<MonitorChartsQueryResult>;

export const MonitorChartsComponent = ({
  data,
  mean,
  range,
  monitorId,
  dateRangeStart,
  dateRangeEnd,
  loading,
}: Props) => {
  const [getUrlParams] = useUrlParams();
  if (data && data.monitorChartsData) {
    const {
      monitorChartsData: { locationDurationLines },
    } = data;

    const { absoluteDateRangeStart, absoluteDateRangeEnd } = getUrlParams();

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <DurationChart
            locationDurationLines={locationDurationLines}
            meanColor={mean}
            rangeColor={range}
            loading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <SnapshotHistogram
            absoluteStartDate={absoluteDateRangeStart}
            absoluteEndDate={absoluteDateRangeEnd}
            height="400px"
            isResponsive={false}
            variables={{ dateRangeStart, dateRangeEnd, monitorId }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return (
    <Fragment>
      {i18n.translate('xpack.uptime.monitorCharts.loadingMessage', {
        defaultMessage: 'Loading…',
      })}
    </Fragment>
  );
};

export const MonitorCharts = withUptimeGraphQL<MonitorChartsQueryResult, MonitorChartsProps>(
  MonitorChartsComponent,
  monitorChartsQuery
);
