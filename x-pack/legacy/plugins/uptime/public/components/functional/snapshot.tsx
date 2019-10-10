/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { get } from 'lodash';
import { DonutChart } from './charts';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { snapshotQuery } from '../../queries';
import { ChartWrapper } from './charts/chart_wrapper';

const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;

interface SnapshotQueryResult {
  snapshot?: SnapshotType;
}

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent = ({
  data,
  loading,
}: UptimeGraphQLQueryProps<SnapshotQueryResult>) => (
  <ChartWrapper loading={loading}>
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="xpack.uptime.snapshot.downCountsMessage"
          defaultMessage="{down}/{total} monitors are down"
          values={{
            down: get<number>(data, 'snapshot.counts.down', 0),
            total: get<number>(data, 'snapshot.counts.total', 0),
          }}
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <DonutChart
      up={get<number>(data, 'snapshot.counts.up', 0)}
      down={get<number>(data, 'snapshot.counts.down', 0)}
      height={SNAPSHOT_CHART_HEIGHT}
      width={SNAPSHOT_CHART_WIDTH}
    />
  </ChartWrapper>
);

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 */
export const Snapshot = withUptimeGraphQL<SnapshotQueryResult>(SnapshotComponent, snapshotQuery);
