/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { DonutChart } from './charts';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { snapshotQuery } from '../../queries';
import { ChartWrapper } from './charts/chart_wrapper';

const SNAPSHOT_WIDTH = 128;
const SNAPSHOT_HEIGHT = 128;

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
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage
          id="xpack.uptime.snapshot.endpointStatusTitle"
          defaultMessage="Current status"
        />
      </h5>
    </EuiTitle>
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem>
        <DonutChart
          up={data && data.snapshot ? data.snapshot.counts.up : 0}
          down={data && data.snapshot ? data.snapshot.counts.down : 0}
          height={SNAPSHOT_HEIGHT}
          width={SNAPSHOT_WIDTH}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </ChartWrapper>
);

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 */
export const Snapshot = withUptimeGraphQL<SnapshotQueryResult>(SnapshotComponent, snapshotQuery);
