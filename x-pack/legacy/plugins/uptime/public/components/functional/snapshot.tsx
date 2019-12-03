/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useEffect, useContext } from 'react';
import { get } from 'lodash';
import { Snapshot as SnapshotType } from '../../../common/runtime_types';
import { DonutChart } from './charts';
import { ChartWrapper } from './charts/chart_wrapper';
import { SnapshotHeading } from './snapshot_heading';
import { useUrlParams } from '../../hooks';
import {
  fetchSnapshotCount as fetchSnapshotCountAction,
  fetchSnapshotCountSuccess,
  fetchSnapshotCountFail,
} from '../../state/actions';
import { UptimeSettingsContext, UptimeRefreshContext } from '../../contexts';
import { fetchSnapshotCount } from '../../state/api';
import { SnapshotContext } from '../../contexts/snapshot_context';

const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;

/**
 * Props expected from parent components.
 */
interface OwnProps {
  dateRangeStart?: string;
  dateRangeEnd?: string;
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

interface ApiRequest {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

/**
 * This component visualizes a KPI and histogram chart to help users quickly
 * glean the status of their uptime environment.
 * @param props the props required by the component
 */
export const Snapshot: React.FC<Props> = ({ height, loading }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);
  const { lastRefresh } = useContext(UptimeRefreshContext);
  const [getUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, filters, statusFilter } = getUrlParams();
  const { dispatch, ...state } = useContext(SnapshotContext);
  useEffect(() => {
    dispatch(fetchSnapshotCountAction(dateRangeStart, dateRangeEnd, filters, statusFilter));
    async function f(props: ApiRequest) {
      dispatch(fetchSnapshotCountSuccess(await fetchSnapshotCount({ ...props })));
    }
    try {
      f({
        basePath,
        dateRangeStart,
        dateRangeEnd,
        filters,
        statusFilter,
      });
    } catch (e) {
      dispatch(fetchSnapshotCountFail(e));
    }
  }, [dateRangeStart, dateRangeEnd, filters, lastRefresh, statusFilter]);
  return <PresentationalComponent count={state.count} height={height} loading={loading} />;
};
