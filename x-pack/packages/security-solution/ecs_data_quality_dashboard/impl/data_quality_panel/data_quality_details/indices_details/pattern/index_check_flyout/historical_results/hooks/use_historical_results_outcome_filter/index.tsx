/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import { useAbortControllerRef } from '../../../../../../../hooks/use_abort_controller_ref';
import { useHistoricalResultsContext } from '../../../../contexts/historical_results_context';
import { FetchHistoricalResultsQueryState, UseHistoricalResultsFetchOpts } from '../../../types';
import { FetchHistoricalResultsQueryAction } from '../../types';
import { useIsMountedRef } from '../../../../../../../hooks/use_is_mounted_ref';

export interface UseHistoricalResultsOutcomeFilterOpts {
  indexName: string;
  fetchHistoricalResultsQueryState: FetchHistoricalResultsQueryState;
  fetchHistoricalResultsQueryDispatch: React.Dispatch<FetchHistoricalResultsQueryAction>;
}

export interface UseHistoricalResultsOutcomeFilterReturnValue {
  handleDefaultOutcome: () => void;
  handlePassOutcome: () => void;
  handleFailOutcome: () => void;
  isShowAll: boolean;
  isShowPass: boolean;
  isShowFail: boolean;
}

export const useHistoricalResultsOutcomeFilter = ({
  indexName,
  fetchHistoricalResultsQueryState,
  fetchHistoricalResultsQueryDispatch,
}: UseHistoricalResultsOutcomeFilterOpts): UseHistoricalResultsOutcomeFilterReturnValue => {
  const fetchHistoricalResultsFromOutcomeAbortControllerRef = useAbortControllerRef();
  const { isMountedRef } = useIsMountedRef();
  const { fetchHistoricalResults } = useHistoricalResultsContext();

  const handleOutcomeFilterChange = useCallback(
    async (outcome: 'pass' | 'fail' | undefined) => {
      const opts: UseHistoricalResultsFetchOpts = {
        indexName,
        abortController: fetchHistoricalResultsFromOutcomeAbortControllerRef.current,
        size: fetchHistoricalResultsQueryState.size,
        from: 0,
        startDate: fetchHistoricalResultsQueryState.startDate,
        endDate: fetchHistoricalResultsQueryState.endDate,
      };

      if (outcome != null) {
        opts.outcome = outcome;
      }

      await fetchHistoricalResults(opts);

      if (isMountedRef.current) {
        fetchHistoricalResultsQueryDispatch({ type: 'SET_OUTCOME', payload: outcome });
      }
    },
    [
      fetchHistoricalResults,
      fetchHistoricalResultsFromOutcomeAbortControllerRef,
      fetchHistoricalResultsQueryDispatch,
      fetchHistoricalResultsQueryState.endDate,
      fetchHistoricalResultsQueryState.size,
      fetchHistoricalResultsQueryState.startDate,
      indexName,
      isMountedRef,
    ]
  );

  const handleDefaultOutcome = useCallback(() => {
    handleOutcomeFilterChange(undefined);
  }, [handleOutcomeFilterChange]);

  const handlePassOutcome = useCallback(() => {
    handleOutcomeFilterChange('pass');
  }, [handleOutcomeFilterChange]);

  const handleFailOutcome = useCallback(() => {
    handleOutcomeFilterChange('fail');
  }, [handleOutcomeFilterChange]);

  const isShowAll = fetchHistoricalResultsQueryState.outcome == null;
  const isShowPass = fetchHistoricalResultsQueryState.outcome === 'pass';
  const isShowFail = fetchHistoricalResultsQueryState.outcome === 'fail';

  return {
    handleDefaultOutcome,
    handlePassOutcome,
    handleFailOutcome,
    isShowAll,
    isShowPass,
    isShowFail,
  };
};
