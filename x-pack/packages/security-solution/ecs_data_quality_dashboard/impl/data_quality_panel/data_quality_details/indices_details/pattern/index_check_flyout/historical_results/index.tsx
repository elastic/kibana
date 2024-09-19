/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTablePagination,
  EuiText,
  EuiTextColor,
  OnTimeChangeProps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { Fragment, useCallback, useEffect, useMemo, useReducer } from 'react';

import { useIsMounted } from '../../../../../hooks/use_is_mounted';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { useHistoricalResultsContext } from '../contexts/historical_results_context';
import { FAIL, PASS } from '../../translations';
import { IndexResultBadge } from '../../index_result_badge';
import { getFormattedCheckTime } from '../utils/get_formatted_check_time';
import { getCheckTextColor } from '../../utils/get_check_text_color';
import {
  DEFAULT_HISTORICAL_RESULTS_END_DATE,
  DEFAULT_HISTORICAL_RESULTS_START_DATE,
} from '../constants';
import { fetchHistoricalResultsQueryReducer } from './reducers/fetch_historical_results_query_reducer';
import { paginationReducer } from './reducers/pagination_reducer';
import { FetchHistoricalResultsQueryState } from '../types';
import { PaginationReducerState } from './types';
import { LoadingEmptyPrompt } from '../../loading_empty_prompt';
import { ErrorEmptyPrompt } from '../../error_empty_prompt';
import { StyledAccordion, StyledFilterGroupFlexItem, StyledText } from './styles';
import { useFetchHistoricalResultsAbortControllers } from './hooks/use_fetch_historical_results_abort_controllers';
import {
  ALL,
  COUNTED_INCOMPATIBLE_FIELDS,
  ERROR_LOADING_HISTORICAL_RESULTS,
  LOADING_HISTORICAL_RESULTS,
  NO_HISTORICAL_RESULTS,
  NO_HISTORICAL_RESULTS_BODY,
  TOTAL_CHECKS,
} from './translations';
import { HistoricalResult } from './historical_result';

export interface Props {
  indexName: string;
}

const DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE = 10;

export const fetchHistoricalResultsInitialState: FetchHistoricalResultsQueryState = {
  startDate: DEFAULT_HISTORICAL_RESULTS_START_DATE,
  endDate: DEFAULT_HISTORICAL_RESULTS_END_DATE,
  size: DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE,
  from: 0,
};

export const initialPaginationState: PaginationReducerState = {
  activePage: 0,
  pageCount: 1,
  rowSize: DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE,
};

export const HistoricalResultsComponent: React.FC<Props> = ({ indexName }) => {
  const { historicalResultsState, fetchHistoricalResults } = useHistoricalResultsContext();

  const {
    fetchHistoricalResultsFromDateAbortControllerRef,
    fetchHistoricalResultsFromOutcomeAbortControllerRef,
    fetchHistoricalResultsFromSetPageAbortControllerRef,
    fetchHistoricalResultsFromSetSizeAbortControllerRef,
  } = useFetchHistoricalResultsAbortControllers();

  const { isILMAvailable, formatNumber } = useDataQualityContext();
  const { isMountedRef } = useIsMounted();
  const historicalResultsAccordionId = useGeneratedHtmlId({ prefix: 'historicalResultsAccordion' });

  const totalResultsFormatted = useMemo(
    () => formatNumber(historicalResultsState.total),
    [formatNumber, historicalResultsState.total]
  );
  const { results } = historicalResultsState;

  // holds state for the fetch historical results query object
  // that is passed to the fetchHistoricalResults function
  const [fetchHistoricalResultsQueryState, fetchHistoricalResultsQueryDispatch] = useReducer(
    fetchHistoricalResultsQueryReducer,
    fetchHistoricalResultsInitialState
  );

  const [paginationState, paginationDispatch] = useReducer(
    paginationReducer,
    initialPaginationState
  );

  // this looks like a partial duplication of an existing behavior
  // a little down below in the handleChangeItemsPerPage function
  // but it's necessary to ensure that the pagination state depending
  // on the total results is updated when the total results change
  // from outside of the component
  //
  // and no we don't need to move everything into useEffect
  // because useEffect driven render updates are a cause of confusion
  // and potential infintite rerender bugs
  //
  // so we keep the absolute necessary minimum in useEffect
  useEffect(() => {
    paginationDispatch({
      type: 'SET_ROW_SIZE',
      payload: {
        rowSize: paginationState.rowSize,
        totalResults: historicalResultsState.total,
      },
    });
  }, [historicalResultsState.total, paginationState.rowSize]);

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
      const rowSize = fetchHistoricalResultsQueryState.size;
      const nextFrom = nextPageIndex * rowSize;

      await fetchHistoricalResults({
        indexName,
        abortController: fetchHistoricalResultsFromSetPageAbortControllerRef.current,
        size: fetchHistoricalResultsQueryState.size,
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
      fetchHistoricalResultsQueryState.endDate,
      fetchHistoricalResultsQueryState.outcome,
      fetchHistoricalResultsQueryState.size,
      fetchHistoricalResultsQueryState.startDate,
      indexName,
      isMountedRef,
    ]
  );

  const handleTimeChange = useCallback(
    async ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (isInvalid) {
        return;
      }

      await fetchHistoricalResults({
        abortController: fetchHistoricalResultsFromDateAbortControllerRef.current,
        indexName,
        size: fetchHistoricalResultsQueryState.size,
        from: 0,
        startDate: start,
        endDate: end,
        ...(fetchHistoricalResultsQueryState.outcome && {
          outcome: fetchHistoricalResultsQueryState.outcome,
        }),
      });

      if (isMountedRef.current) {
        fetchHistoricalResultsQueryDispatch({
          type: 'SET_DATE',
          payload: { startDate: start, endDate: end },
        });
      }
    },
    [
      fetchHistoricalResults,
      fetchHistoricalResultsFromDateAbortControllerRef,
      fetchHistoricalResultsQueryState.outcome,
      fetchHistoricalResultsQueryState.size,
      indexName,
      isMountedRef,
    ]
  );

  if (historicalResultsState.isLoading) {
    return <LoadingEmptyPrompt loading={LOADING_HISTORICAL_RESULTS} />;
  }

  if (historicalResultsState.error) {
    return <ErrorEmptyPrompt title={ERROR_LOADING_HISTORICAL_RESULTS} />;
  }

  return (
    <div data-test-subj="historicalResults">
      <EuiFlexGroup justifyContent="spaceBetween">
        <StyledFilterGroupFlexItem grow={false}>
          <EuiFilterGroup fullWidth>
            <EuiFilterButton
              hasActiveFilters={fetchHistoricalResultsQueryState.outcome === undefined}
              onClick={async () => {
                await fetchHistoricalResults({
                  indexName,
                  abortController: fetchHistoricalResultsFromOutcomeAbortControllerRef.current,
                  size: fetchHistoricalResultsQueryState.size,
                  from: 0,
                  startDate: fetchHistoricalResultsQueryState.startDate,
                  endDate: fetchHistoricalResultsQueryState.endDate,
                });
                if (isMountedRef.current) {
                  fetchHistoricalResultsQueryDispatch({ type: 'SET_OUTCOME', payload: undefined });
                }
              }}
            >
              {ALL}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={fetchHistoricalResultsQueryState.outcome === 'pass'}
              onClick={async () => {
                await fetchHistoricalResults({
                  indexName,
                  abortController: fetchHistoricalResultsFromOutcomeAbortControllerRef.current,
                  size: fetchHistoricalResultsQueryState.size,
                  from: 0,
                  startDate: fetchHistoricalResultsQueryState.startDate,
                  endDate: fetchHistoricalResultsQueryState.endDate,
                  outcome: 'pass',
                });
                if (isMountedRef.current) {
                  fetchHistoricalResultsQueryDispatch({ type: 'SET_OUTCOME', payload: 'pass' });
                }
              }}
            >
              {PASS}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={fetchHistoricalResultsQueryState.outcome === 'fail'}
              onClick={async () => {
                await fetchHistoricalResults({
                  indexName,
                  abortController: fetchHistoricalResultsFromOutcomeAbortControllerRef.current,
                  size: fetchHistoricalResultsQueryState.size,
                  from: 0,
                  startDate: fetchHistoricalResultsQueryState.startDate,
                  endDate: fetchHistoricalResultsQueryState.endDate,
                  outcome: 'fail',
                });
                if (isMountedRef.current) {
                  fetchHistoricalResultsQueryDispatch({ type: 'SET_OUTCOME', payload: 'fail' });
                }
              }}
            >
              {FAIL}
            </EuiFilterButton>
          </EuiFilterGroup>
        </StyledFilterGroupFlexItem>
        <EuiFlexItem>
          <EuiSuperDatePicker
            width="full"
            start={fetchHistoricalResultsQueryState.startDate}
            end={fetchHistoricalResultsQueryState.endDate}
            onTimeChange={handleTimeChange}
            showUpdateButton={isILMAvailable}
            isDisabled={!isILMAvailable}
            data-test-subj="historicalResultsDatePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <StyledText size="s">
        {TOTAL_CHECKS(historicalResultsState.total, totalResultsFormatted)}
      </StyledText>
      {results.length > 0 ? (
        results.map((result) => (
          <Fragment key={result.checkedAt}>
            <EuiSpacer />
            <StyledAccordion
              id={historicalResultsAccordionId}
              buttonElement="div"
              buttonContent={
                <EuiFlexGroup wrap={true} alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <IndexResultBadge incompatible={result.incompatibleFieldCount} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <StyledText size="s">{getFormattedCheckTime(result.checkedAt)}</StyledText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <EuiTextColor color={getCheckTextColor(result.incompatibleFieldCount)}>
                        {formatNumber(result.incompatibleFieldCount)}
                      </EuiTextColor>{' '}
                      {COUNTED_INCOMPATIBLE_FIELDS(result.incompatibleFieldCount)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            >
              <HistoricalResult indexName={indexName} result={result} />
            </StyledAccordion>
          </Fragment>
        ))
      ) : (
        <EuiEmptyPrompt iconType="clockCounter" title={<h2>{NO_HISTORICAL_RESULTS}</h2>}>
          {NO_HISTORICAL_RESULTS_BODY}
        </EuiEmptyPrompt>
      )}
      {results.length > 0 && (
        <>
          <EuiSpacer />
          <EuiTablePagination
            pageCount={paginationState.pageCount}
            activePage={paginationState.activePage}
            onChangePage={handleChangeActivePage}
            itemsPerPage={paginationState.rowSize}
            onChangeItemsPerPage={handleChangeItemsPerPage}
            itemsPerPageOptions={[10, 25, 50]}
          />
        </>
      )}
    </div>
  );
};

HistoricalResultsComponent.displayName = 'HistoricalResultsComponent';

export const HistoricalResults = React.memo(HistoricalResultsComponent);
