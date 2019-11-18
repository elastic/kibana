/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { get } from 'lodash';
import { DonutChart } from './charts';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { snapshotQuery } from '../../queries';
import { ChartWrapper } from './charts/chart_wrapper';
import { SnapshotHeading } from './snapshot_heading';

const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;

interface SnapshotQueryResult {
  snapshot?: SnapshotType;
}

interface SnapshotProps {
  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;
}

export type SnapshotComponentProps = SnapshotProps & UptimeGraphQLQueryProps<SnapshotQueryResult>;

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent = ({ data, loading, height }: SnapshotComponentProps) => (
  <ChartWrapper loading={loading} height={height}>
    <SnapshotHeading
      down={get<number>(data, 'snapshot.counts.down', 0)}
      total={get<number>(data, 'snapshot.counts.total', 0)}
    />
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
export const Snapshot = withUptimeGraphQL<SnapshotQueryResult, SnapshotProps>(
  SnapshotComponent,
  snapshotQuery
);
