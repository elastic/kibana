/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTablePagination,
} from '@elastic/eui';
import React, { FC, useMemo, useReducer } from 'react';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { useHistoricalResultsContext } from '../../contexts/historical_results_context';
import {
  DEFAULT_HISTORICAL_RESULTS_END_DATE,
  DEFAULT_HISTORICAL_RESULTS_START_DATE,
} from '../constants';
import { fetchHistoricalResultsQueryReducer } from './reducers/fetch_historical_results_query_reducer';
import { FetchHistoricalResultsQueryState } from '../types';
import { LoadingEmptyPrompt } from '../../loading_empty_prompt';
import { ErrorEmptyPrompt } from '../../error_empty_prompt';
import { StyledFilterGroupFlexItem, StyledText } from './styles';
import {
  ALL,
  ERROR_LOADING_HISTORICAL_RESULTS,
  FILTER_RESULTS_BY_OUTCOME,
  LOADING_HISTORICAL_RESULTS,
  TOTAL_CHECKS,
} from './translations';
import { DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE } from './constants';
import { HistoricalResultsList } from './historical_results_list';
import { useHistoricalResultsPagination } from './hooks/use_historical_results_pagination';
import { FAIL, PASS } from '../../translations';
import { useHistoricalResultsOutcomeFilter } from './hooks/use_historical_results_outcome_filter';
import { useHistoricalResultsDatePicker } from './hooks/use_historical_results_date_picker';

const historicalResultsListId = 'historicalResultsList';

export const initialFetchHistoricalResultsQueryState: FetchHistoricalResultsQueryState = {
  startDate: DEFAULT_HISTORICAL_RESULTS_START_DATE,
  endDate: DEFAULT_HISTORICAL_RESULTS_END_DATE,
  size: DEFAULT_HISTORICAL_RESULTS_PAGE_SIZE,
  from: 0,
};

const itemsPerPageOptions = [10, 25, 50];

export interface Props {
  indexName: string;
}

export const HistoricalResultsComponent: FC<Props> = ({ indexName }) => {
  const { formatNumber } = useDataQualityContext();

  // Manages state for the fetch historical results query object
  // used by the fetchHistoricalResults function
  const [fetchHistoricalResultsQueryState, fetchHistoricalResultsQueryDispatch] = useReducer(
    fetchHistoricalResultsQueryReducer,
    initialFetchHistoricalResultsQueryState
  );

  const { paginationState, handleChangeActivePage, handleChangeItemsPerPage } =
    useHistoricalResultsPagination({
      indexName,
      fetchHistoricalResultsQueryState,
      fetchHistoricalResultsQueryDispatch,
    });

  const {
    handleDefaultOutcome,
    handlePassOutcome,
    handleFailOutcome,
    isShowAll,
    isShowPass,
    isShowFail,
  } = useHistoricalResultsOutcomeFilter({
    indexName,
    fetchHistoricalResultsQueryState,
    fetchHistoricalResultsQueryDispatch,
  });

  const { handleTimeChange } = useHistoricalResultsDatePicker({
    indexName,
    fetchHistoricalResultsQueryState,
    fetchHistoricalResultsQueryDispatch,
  });

  const { historicalResultsState } = useHistoricalResultsContext();

  const totalResultsFormatted = useMemo(
    () => formatNumber(historicalResultsState.total),
    [formatNumber, historicalResultsState.total]
  );

  if (historicalResultsState.isLoading) {
    return <LoadingEmptyPrompt loading={LOADING_HISTORICAL_RESULTS} />;
  }

  if (historicalResultsState.error) {
    return <ErrorEmptyPrompt title={ERROR_LOADING_HISTORICAL_RESULTS} />;
  }

  const totalChecksText = TOTAL_CHECKS(historicalResultsState.total, totalResultsFormatted);

  return (
    <div data-test-subj="historicalResults">
      <EuiFlexGroup justifyContent="spaceBetween">
        <StyledFilterGroupFlexItem grow={false}>
          <EuiFilterGroup
            data-test-subj="historicalResultsOutcomeFilterGroup"
            role="radiogroup"
            aria-label={FILTER_RESULTS_BY_OUTCOME}
          >
            <EuiFilterButton
              hasActiveFilters={isShowAll}
              role="radio"
              data-test-subj="historicalResultsOutcomeFilterAll"
              aria-checked={isShowAll}
              onClick={handleDefaultOutcome}
            >
              {ALL}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={isShowPass}
              role="radio"
              data-test-subj="historicalResultsOutcomeFilterPass"
              aria-checked={isShowPass}
              onClick={handlePassOutcome}
            >
              {PASS}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={isShowFail}
              role="radio"
              data-test-subj="historicalResultsOutcomeFilterFail"
              aria-checked={isShowFail}
              onClick={handleFailOutcome}
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
            data-test-subj="historicalResultsDatePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <StyledText
        size="s"
        role="status"
        aria-live="polite"
        // because it's not inferred in accessibility tree
        aria-label={totalChecksText}
        data-test-subj="historicalResultsTotalChecks"
        aria-describedby={historicalResultsListId}
      >
        {totalChecksText}
      </StyledText>
      <div id={historicalResultsListId}>
        <HistoricalResultsList indexName={indexName} />
      </div>
      {paginationState.pageCount > 1 ? (
        <div data-test-subj="historicalResultsPagination">
          <EuiSpacer />
          <EuiTablePagination
            data-test-subj="historicalResultsTablePagination"
            pageCount={paginationState.pageCount}
            activePage={paginationState.activePage}
            onChangePage={handleChangeActivePage}
            itemsPerPage={paginationState.rowSize}
            onChangeItemsPerPage={handleChangeItemsPerPage}
            itemsPerPageOptions={itemsPerPageOptions}
          />
        </div>
      ) : null}
    </div>
  );
};

HistoricalResultsComponent.displayName = 'HistoricalResultsComponent';

export const HistoricalResults = React.memo(HistoricalResultsComponent);
