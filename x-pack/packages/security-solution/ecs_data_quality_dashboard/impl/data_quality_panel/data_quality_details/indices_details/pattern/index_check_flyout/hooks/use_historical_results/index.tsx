/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback } from 'react';
import { StorageResult } from '../../../../../../types';

import { GET_RESULTS_ERROR_TITLE } from '../../../../../../translations';
import { useDataQualityContext } from '../../../../../../data_quality_context';
import { useIsMounted } from '../../../../../../hooks/use_is_mounted';
import { fetchHistoricalResults } from './utils/fetch_historical_results';
import { UseHistoricalResultsReturnValue } from './types';
import { FetchHistoricalResultsOpts } from '../../types';

interface State {
  results: StorageResult[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}

const initialState: State = {
  results: [],
  total: 0,
  isLoading: true,
  error: null,
};

type Action =
  | { type: 'FETCH_SUCCESS'; payload: { results: StorageResult[]; total: number } }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_ERROR'; payload: Error };

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        results: action.payload.results,
        total: action.payload.total,
        isLoading: false,
        error: null,
      };
    case 'FETCH_START':
      return {
        results: [],
        total: 0,
        isLoading: true,
        error: null,
      };
    case 'FETCH_ERROR':
      return {
        results: [],
        total: 0,
        isLoading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export const useHistoricalResults = (): UseHistoricalResultsReturnValue => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { httpFetch, toasts } = useDataQualityContext();
  const { isMountedRef } = useIsMounted();

  const fetchResults = useCallback(
    async ({
      abortController,
      indexName,
      size,
      from,
      startDate,
      endDate,
      outcome,
    }: Omit<FetchHistoricalResultsOpts, 'httpFetch'>) => {
      dispatch({ type: 'FETCH_START' });

      try {
        const { results, total } = await fetchHistoricalResults({
          indexName,
          httpFetch,
          abortController,
          size,
          from,
          startDate,
          endDate,
          outcome,
        });

        if (isMountedRef.current) {
          dispatch({
            type: 'FETCH_SUCCESS',
            payload: {
              results,
              total,
            },
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          toasts.addError(error, { title: GET_RESULTS_ERROR_TITLE });
          dispatch({ type: 'FETCH_ERROR', payload: error });
        }
      }
    },
    [dispatch, httpFetch, toasts, isMountedRef]
  );

  return {
    historicalResultsState: {
      results: state.results,
      total: state.total,
      isLoading: state.isLoading,
      error: state.error,
    },
    fetchHistoricalResults: fetchResults,
  };
};
