/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { indexStatusAction } from '../../../state/actions';
import { indexStatusSelector } from '../../../state/selectors';
import { EmptyStateComponent } from '../../functional/empty_state/empty_state';
import { UptimeRefreshContext } from '../../../contexts';

export const EmptyState: React.FC = ({ children }) => {
  const { data, loading, error } = useSelector(indexStatusSelector);
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(indexStatusAction.get());
  }, [dispatch, lastRefresh]);

  return (
    <EmptyStateComponent
      statesIndexStatus={data}
      loading={loading}
      errors={error ? [error] : undefined}
      children={children as React.ReactElement}
    />
  );
};
