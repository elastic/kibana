/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useReducer } from 'react';

import { useIsMountedRef } from '../../../../../../../hooks/use_is_mounted_ref';
import { useAbortControllerRef } from '../../../../../../../hooks/use_abort_controller_ref';
import { DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE } from '../../constants';
import { FetchHistoricalResultsQueryAction, PaginationReducerState } from '../../types';
import { useHistoricalResultsContext } from '../../../../contexts/historical_results_context';
import { historicalResultsPaginationReducer } from './reducers/historical_results_pagination_reducer';
import { FetchHistoricalResultsQueryState } from '../../../types';

export const initialPaginationState: PaginationReducerState = {
  activePage: 0,
  pageCount: 1,
  rowSize: DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE,
};

export interface UseHistoricalResultsPaginationOpts {
  indexName: string;
  fetchHistoricalResultsQueryState: FetchHistoricalResultsQueryState;
  fetchHistoricalResultsQueryDispatch: React.Dispatch<FetchHistoricalResultsQueryAction>;
}

export interface UseHistoricalResultsPaginationReturnValue {
  paginationState: PaginationReducerState;
  handleChangeItemsPerPage: (rowSize: number) => Promise<void>;
  handleChangeActivePage: (nextPageIndex: number) => Promise<void>;
}

export const useHistoricalResultsPagination = ({
  indexName,
  fetchHistoricalResultsQueryState,
  fetchHistoricalResultsQueryDispatch,
}: UseHistoricalResultsPaginationOpts): UseHistoricalResultsPaginationReturnValue => {
  const fetchHistoricalResultsFromSetPageAbortControllerRef = useAbortControllerRef();
  const fetchHistoricalResultsFromSetSizeAbortControllerRef = useAbortControllerRef();
  const { isMountedRef } = useIsMountedRef();

  const { historicalResultsState, fetchHistoricalResults } = useHistoricalResultsContext();

  const [paginationState, paginationDispatch] = useReducer(
    historicalResultsPaginationReducer,
    initialPaginationState
  );
  // Ensure pagination state updates when total results change externally.
  // Avoid moving everything into useEffect to prevent confusion and potential infinite rerender bugs.
  // Keep only the necessary minimum in useEffect.
  useEffect(() => {
    paginationDispatch({
      type: 'SET_ROW_SIZE',
      payload: {
        rowSize: paginationState.rowSize,
        totalResults: historicalResultsState.total,
      },
    });
  }, [historicalResultsState.total, paginationDispatch, paginationState.rowSize]);

  const handleChangeItemsPerPage = useCallback(
    async (rowSize: number) => {
      await fetchHistoricalResults({
        indexName,
        abortController: fetchHistoricalResultsFromSetSizeAbortControllerRef.current,
        startDate: fetchHistoricalResultsQueryState.startDate,
        endDate: fetchHistoricalResultsQueryState.endDate,
        from: 0,
        size: rowSize,
        ...(fetchHistoricalResultsQueryState.outcome && {
          outcome: fetchHistoricalResultsQueryState.outcome,
        }),
      });

      if (isMountedRef.current) {
        fetchHistoricalResultsQueryDispatch({ type: 'SET_SIZE', payload: rowSize });
        paginationDispatch({
          type: 'SET_ROW_SIZE',
          payload: {
            rowSize,
            totalResults: historicalResultsState.total,
          },
        });
      }
    },
    [
      fetchHistoricalResults,
      fetchHistoricalResultsFromSetSizeAbortControllerRef,
      fetchHistoricalResultsQueryDispatch,
      fetchHistoricalResultsQueryState.endDate,
      fetchHistoricalResultsQueryState.outcome,
      fetchHistoricalResultsQueryState.startDate,
      historicalResultsState.total,
      indexName,
      isMountedRef,
    ]
  );

  const handleChangeActivePage = useCallback(
    async (nextPageIndex: number) => {
      const size = fetchHistoricalResultsQueryState.size;
      const nextFrom = nextPageIndex * size;

      await fetchHistoricalResults({
        indexName,
        abortController: fetchHistoricalResultsFromSetPageAbortControllerRef.current,
        size,
        startDate: fetchHistoricalResultsQueryState.startDate,
        endDate: fetchHistoricalResultsQueryState.endDate,
        from: nextFrom,
        ...(fetchHistoricalResultsQueryState.outcome && {
          outcome: fetchHistoricalResultsQueryState.outcome,
        }),
      });

      if (isMountedRef.current) {
        fetchHistoricalResultsQueryDispatch({ type: 'SET_FROM', payload: nextFrom });
        paginationDispatch({ type: 'SET_ACTIVE_PAGE', payload: nextPageIndex });
      }
    },
    [
      fetchHistoricalResults,
      fetchHistoricalResultsFromSetPageAbortControllerRef,
      fetchHistoricalResultsQueryDispatch,
      fetchHistoricalResultsQueryState.endDate,
      fetchHistoricalResultsQueryState.outcome,
      fetchHistoricalResultsQueryState.size,
      fetchHistoricalResultsQueryState.startDate,
      indexName,
      isMountedRef,
    ]
  );

  return {
    paginationState,
    handleChangeItemsPerPage,
    handleChangeActivePage,
  };
};
