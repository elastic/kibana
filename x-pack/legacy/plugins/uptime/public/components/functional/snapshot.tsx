/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { get } from 'lodash';
import { DonutChart } from './charts';
import { ChartWrapper } from './charts/chart_wrapper';
import { SnapshotHeading } from './snapshot_heading';
import { Snapshot as SnapshotType } from '../../../common/runtime_types';

const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;

interface SnapshotComponentProps {
  count: SnapshotType;
  loading: boolean;
  height?: string;
}

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const SnapshotComponent: React.FC<SnapshotComponentProps> = ({ count, height, loading }) => (
  <ChartWrapper loading={loading} height={height}>
    <SnapshotHeading down={get<number>(count, 'down', 0)} total={get<number>(count, 'total', 0)} />
    <EuiSpacer size="xs" />
    <DonutChart
      up={get<number>(count, 'up', 0)}
      down={get<number>(count, 'down', 0)}
      height={SNAPSHOT_CHART_HEIGHT}
      width={SNAPSHOT_CHART_WIDTH}
    />
  </ChartWrapper>
);
