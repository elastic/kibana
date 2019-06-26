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
import { ChecksChart } from './charts/checks_chart';

interface MonitorChartsQueryResult {
  monitorChartsData?: MonitorChart;
}

interface MonitorChartsProps {
  danger: string;
  mean: string;
  range: string;
  success: string;
}

type Props = MonitorChartsProps & UptimeGraphQLQueryProps<MonitorChartsQueryResult>;

export const MonitorChartsComponent = (props: Props) => {
  const { danger, data, mean, range, success } = props;
  if (data && data.monitorChartsData) {
    const {
      monitorChartsData: { locationDurationLines, status },
    } = data;

    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem style={{ height: 400 }}>
            <DurationChart
              locationDurationLines={locationDurationLines}
              meanColor={mean}
              rangeColor={range}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ChecksChart dangerColor={danger} status={status} successColor={success} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
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
