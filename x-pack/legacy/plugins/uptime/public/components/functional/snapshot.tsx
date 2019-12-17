/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { get } from 'lodash';
import { connect } from 'react-redux';
import { Snapshot as SnapshotType } from '../../../common/runtime_types';
import { DonutChart } from './charts';
import { fetchSnapshotCount } from '../../state/actions';
import { ChartWrapper } from './charts/chart_wrapper';
import { SnapshotHeading } from './snapshot_heading';
import { AppState } from '../../state';

const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;

/**
 * Props expected from parent components.
 */
interface OwnProps {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;
  statusFilter?: string;
}

/**
 * Props given by the Redux store based on action input.
 */
interface StoreProps {
  count: SnapshotType;
  lastRefresh: number;
  loading: boolean;
}

/**
 * Contains functions that will dispatch actions used
 * for this component's lifecyclel
 */
interface DispatchProps {
  loadSnapshotCount: typeof fetchSnapshotCount;
}

/**
 * Props used to render the Snapshot component.
 */
type Props = OwnProps & StoreProps & DispatchProps;

type PresentationalComponentProps = Pick<StoreProps, 'count' | 'loading'> &
  Pick<OwnProps, 'height'>;

export const PresentationalComponent: React.FC<PresentationalComponentProps> = ({
  count,
  height,
  loading,
}) => (
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

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const Container: React.FC<Props> = ({
  count,
  dateRangeStart,
  dateRangeEnd,
  filters,
  height,
  statusFilter,
  lastRefresh,
  loading,
  loadSnapshotCount,
}: Props) => {
  useEffect(() => {
    loadSnapshotCount(dateRangeStart, dateRangeEnd, filters, statusFilter);
  }, [dateRangeStart, dateRangeEnd, filters, lastRefresh, statusFilter]);
  return <PresentationalComponent count={count} height={height} loading={loading} />;
};

/**
 * Provides state to connected component.
 * @param state the root app state
 */
const mapStateToProps = ({
  snapshot: { count, loading },
  ui: { lastRefresh },
}: AppState): StoreProps => ({
  count,
  lastRefresh,
  loading,
});

/**
 * Used for fetching snapshot counts.
 * @param dispatch redux-provided action dispatcher
 */
const mapDispatchToProps = (dispatch: any) => ({
  loadSnapshotCount: (
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string,
    statusFilter?: string
  ): DispatchProps => {
    return dispatch(fetchSnapshotCount(dateRangeStart, dateRangeEnd, filters, statusFilter));
  },
});

// @ts-ignore connect is expecting null | undefined for some reason
export const Snapshot = connect<StoreProps, DispatchProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps
)(Container);
