/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useUrlParams } from '../../../hooks';
import { AppState } from '../../../state';
import { getSnapshotCountAction } from '../../../state/actions';
import { SnapshotComponent } from '../../functional/snapshot';
import { Snapshot as SnapshotType } from '../../../../common/runtime_types';
import { SnapShotQueryParams } from '../../../state/api';

/**
 * Props expected from parent components.
 */
interface OwnProps {
  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;
}

/**
 * Props given by the Redux store based on action input.
 */
interface StoreProps {
  count: SnapshotType;
  lastRefresh: number;
  loading: boolean;
  esKuery: string;
}

/**
 * Contains functions that will dispatch actions used
 * for this component's life cycle
 */
interface DispatchProps {
  loadSnapshotCount: typeof getSnapshotCountAction;
}

/**
 * Props used to render the Snapshot component.
 */
type Props = OwnProps & StoreProps & DispatchProps;

export const Container: React.FC<Props> = ({
  count,
  height,
  lastRefresh,
  loading,
  esKuery,
  loadSnapshotCount,
}: Props) => {
  const [getUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, statusFilter } = getUrlParams();

  useEffect(() => {
    loadSnapshotCount({ dateRangeStart, dateRangeEnd, filters: esKuery, statusFilter });
  }, [dateRangeStart, dateRangeEnd, esKuery, lastRefresh, loadSnapshotCount, statusFilter]);
  return <SnapshotComponent count={count} height={height} loading={loading} />;
};

/**
 * Provides state to connected component.
 * @param state the root app state
 */
const mapStateToProps = ({
  snapshot: { count, loading },
  ui: { lastRefresh, esKuery },
}: AppState): StoreProps => ({
  count,
  lastRefresh,
  loading,
  esKuery,
});

/**
 * Used for fetching snapshot counts.
 * @param dispatch redux-provided action dispatcher
 */
const mapDispatchToProps = (dispatch: any) => ({
  loadSnapshotCount: (params: SnapShotQueryParams): DispatchProps => {
    return dispatch(getSnapshotCountAction(params));
  },
});

export const Snapshot = connect<StoreProps, DispatchProps, OwnProps>(
  // @ts-ignore connect is expecting null | undefined for some reason
  mapStateToProps,
  mapDispatchToProps
)(Container);
