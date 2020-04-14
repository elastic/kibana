/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { getSnapshotCountAction } from '../../../state/actions';
import { SnapshotComponent } from './snapshot';
import { snapshotDataSelector } from '../../../state/selectors';

interface Props {
  /**
   * Height is needed, since by default charts takes height of 100%
   */
  height?: string;
}

export const Snapshot: React.FC<Props> = ({ height }: Props) => {
  const { dateRangeStart, dateRangeEnd, statusFilter } = useGetUrlParams();

  const { count, lastRefresh, loading, esKuery } = useSelector(snapshotDataSelector);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      getSnapshotCountAction({ dateRangeStart, dateRangeEnd, filters: esKuery, statusFilter })
    );
  }, [dateRangeStart, dateRangeEnd, esKuery, lastRefresh, statusFilter, dispatch]);
  return <SnapshotComponent count={count} height={height} loading={loading} />;
};
