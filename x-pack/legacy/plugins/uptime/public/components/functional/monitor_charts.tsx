/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext } from 'react';
import DateMath from '@elastic/datemath';
import { Moment } from 'moment';
import { MonitorChart } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorChartsQuery } from '../../queries';
import { DurationChart } from './charts';
import { UptimeSettingsContext } from '../../contexts';
import { SnapshotHistogram } from './charts/snapshot_histogram';

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

export const MonitorChartsComponent = (props: Props) => {
  const { data, mean, range, monitorId, dateRangeStart, dateRangeEnd } = props;
  if (data && data.monitorChartsData) {
    const {
      monitorChartsData: { locationDurationLines },
    } = data;

    const { colors } = useContext(UptimeSettingsContext);
    const parseDateRange = (r: string): number => {
      const parsed: Moment | undefined = DateMath.parse(r);
      return parsed ? parsed.valueOf() : 0;
    };
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
            <SnapshotHistogram
              absoluteStartDate={parseDateRange(dateRangeStart)}
              absoluteEndDate={parseDateRange(dateRangeEnd)}
              successColor={colors.success}
              dangerColor={colors.danger}
              variables={{ dateRangeStart, dateRangeEnd, monitorId }}
            />
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
