/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { indexStatusAction } from '../../../state/actions';
import { indexStatusSelector } from '../../../state/selectors';
import { EmptyStateComponent } from '../../functional/empty_state/empty_state';

export const EmptyState: React.FC = ({ children }) => {
  const { data, loading, error } = useSelector(indexStatusSelector);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(indexStatusAction.get());
  }, [dispatch]);

  return (
    <EmptyStateComponent
      statesIndexStatus={data}
      loading={loading}
      errors={error ? [error] : undefined}
      children={children as React.ReactElement}
    />
  );
};
