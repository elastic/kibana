/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { inputsModel, inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';

interface SetQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch | inputsModel.RefetchKql;
}

export interface GlobalTimeArgs {
  from: number;
  to: number;
  setQuery: ({ id, inspect, loading, refetch }: SetQuery) => void;
  deleteQuery?: ({ id }: { id: string }) => void;
  isInitializing: boolean;
}

export const useGlobalTime = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const dispatch = useDispatch();
  const { from, to } = useSelector(inputsSelectors.globalTimeRangeSelector);

  const deleteAllQuery = useCallback(props => dispatch(inputsActions.deleteAllQuery(props)), [
    dispatch,
  ]);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      dispatch(inputsActions.setQuery({ inputId: 'global', id, inspect, loading, refetch })),
    [dispatch]
  );

  const deleteQuery = useCallback(
    ({ id }: { id: string }) => dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id })),
    [dispatch]
  );

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
    }
    return () => {
      deleteAllQuery({ id: 'global' });
    };
  }, [isInitializing, deleteAllQuery]);

  return {
    isInitializing,
    from,
    to,
    setQuery,
    deleteQuery,
  };
};
