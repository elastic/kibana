/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';

import {
  esFilters,
  IIndexPattern,
  FilterManager,
  Query,
  TimeHistory,
  TimeRange,
  SavedQuery,
  SearchBar,
  SavedQueryTimeFilter,
} from '../../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';

export interface QueryBarComponentProps {
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  hideSavedQuery?: boolean;
  indexPattern: IIndexPattern;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: esFilters.Filter[];
  onChangedQuery: (query: Query) => void;
  onSubmitQuery: (query: Query, timefilter?: SavedQueryTimeFilter) => void;
  refreshInterval?: number;
  savedQuery?: SavedQuery | null;
  onSavedQuery: (savedQuery: SavedQuery | null) => void;
}

export const QueryBar = memo<QueryBarComponentProps>(
  ({
    dateRangeFrom,
    dateRangeTo,
    hideSavedQuery = false,
    indexPattern,
    isLoading = false,
    isRefreshPaused,
    filterQuery,
    filterManager,
    filters,
    onChangedQuery,
    onSubmitQuery,
    refreshInterval,
    savedQuery,
    onSavedQuery,
    dataTestSubj,
  }) => {
    const [draftQuery, setDraftQuery] = useState(filterQuery);

    useEffect(() => {
      setDraftQuery(filterQuery);
    }, [filterQuery]);

    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (payload.query != null && !isEqual(payload.query, filterQuery)) {
          onSubmitQuery(payload.query);
        }
      },
      [filterQuery, onSubmitQuery]
    );

    const onQueryChange = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (payload.query != null && !isEqual(payload.query, draftQuery)) {
          setDraftQuery(payload.query);
          onChangedQuery(payload.query);
        }
      },
      [draftQuery, onChangedQuery, setDraftQuery]
    );

    const onSaved = useCallback(
      (newSavedQuery: SavedQuery) => {
        onSavedQuery(newSavedQuery);
      },
      [onSavedQuery]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const { query: newQuery, filters: newFilters, timefilter } = savedQueryUpdated.attributes;
        onSubmitQuery(newQuery, timefilter);
        filterManager.setFilters(newFilters || []);
        onSavedQuery(savedQueryUpdated);
      },
      [filterManager, onSubmitQuery, onSavedQuery]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        onSubmitQuery({
          query: '',
          language: savedQuery.attributes.query.language,
        });
        filterManager.setFilters([]);
        onSavedQuery(null);
      }
    }, [filterManager, onSubmitQuery, onSavedQuery, savedQuery]);

    const onFiltersUpdated = useCallback(
      (newFilters: esFilters.Filter[]) => {
        filterManager.setFilters(newFilters);
      },
      [filterManager]
    );

    const CustomButton = <>{null}</>;
    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);

    const searchBarProps = savedQuery != null ? { savedQuery } : {};

    return (
      <SearchBar
        customSubmitButton={CustomButton}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        filters={filters}
        indexPatterns={indexPatterns}
        isLoading={isLoading}
        isRefreshPaused={isRefreshPaused}
        query={draftQuery}
        onClearSavedQuery={onClearSavedQuery}
        onFiltersUpdated={onFiltersUpdated}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        onSaved={onSaved}
        onSavedQueryUpdated={onSavedQueryUpdated}
        refreshInterval={refreshInterval}
        showAutoRefreshOnly={false}
        showFilterBar={!hideSavedQuery}
        showDatePicker={false}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
        timeHistory={new TimeHistory(new Storage(localStorage))}
        dataTestSubj={dataTestSubj}
        {...searchBarProps}
      />
    );
  }
);
