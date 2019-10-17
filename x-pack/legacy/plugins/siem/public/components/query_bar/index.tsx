/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { StaticIndexPattern, IndexPattern } from 'ui/index_patterns';
import { Storage } from 'ui/storage';

import { Query, TimeRange } from 'src/plugins/data/common/types';

import { isEqual } from 'lodash/fp';
import { SavedQuery, SearchBar } from '../../../../../../../src/legacy/core_plugins/data/public';
import { TimeHistory } from '../../../../../../../src/legacy/core_plugins/data/public/timefilter';

interface QueryBarComponentProps {
  indexPattern: StaticIndexPattern;
  filterQuery: Query;
  filters: Filter[];
  onChangedQueryAndFilter: ({ query, filters }: { query: Query; filters: Filter[] }) => void;
  onSubmitQueryAndFilter: ({ query, filters }: { query: Query; filters: Filter[] }) => void;
  savedQuery?: SavedQuery | null;
  setSavedQuery: (savedQuery: SavedQuery | null) => void;
}

export const QueryBar = memo<QueryBarComponentProps>(
  ({
    indexPattern,
    filterQuery,
    filters = [],
    onChangedQueryAndFilter,
    onSubmitQueryAndFilter,
    savedQuery,
    setSavedQuery,
  }) => {
    const [draftQuery, setDraftQuery] = useState(filterQuery);
    const [queryFilters, setQueryFilters] = useState(filters);

    useEffect(() => {
      setDraftQuery(filterQuery);
    }, [filterQuery]);

    useEffect(() => {
      setQueryFilters(filters);
    }, [filters]);

    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (payload.query != null && !isEqual(payload.query, draftQuery)) {
          onSubmitQueryAndFilter({ query: payload.query, filters });
        }
      },
      [draftQuery, filters]
    );

    const onQueryChange = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        if (payload.query != null && !isEqual(payload.query, draftQuery)) {
          onChangedQueryAndFilter({ query: payload.query, filters });
          setDraftQuery(draftQuery);
        }
      },
      [draftQuery, filters]
    );

    const onSaved = useCallback((newSavedQuery: SavedQuery) => {
      setSavedQuery(newSavedQuery);
    }, []);

    const onSavedQueryUpdated = useCallback((savedQueryUpdated: SavedQuery) => {
      const { query: newQuery, filters: newFilters } = savedQueryUpdated.attributes;
      onSubmitQueryAndFilter({ query: newQuery, filters: newFilters || [] });
    }, []);

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        onSubmitQueryAndFilter({
          query: {
            query: '',
            language: savedQuery.attributes.query.language,
          },
          filters: [],
        });
      }
    }, []);

    const onFiltersUpdated = useCallback(
      (newFilters: Filter[]) => {
        setQueryFilters(newFilters);
        onSubmitQueryAndFilter({
          query: filterQuery,
          filters: newFilters,
        });
      },
      [filters, filterQuery]
    );

    const CustomButton = <>{null}</>;
    const indexPatterns = useMemo(() => [indexPattern as IndexPattern], [indexPattern]);

    const searchBarProps = savedQuery != null ? { savedQuery } : {};

    return (
      <SearchBar
        customSubmitButton={CustomButton}
        filters={queryFilters}
        indexPatterns={indexPatterns}
        query={draftQuery}
        onClearSavedQuery={onClearSavedQuery}
        onFiltersUpdated={onFiltersUpdated}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        onSaved={onSaved}
        onSavedQueryUpdated={onSavedQueryUpdated}
        showAutoRefreshOnly={false}
        showFilterBar={true}
        showDatePicker={false}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
        timeHistory={new TimeHistory(new Storage(localStorage))}
        {...searchBarProps}
      />
    );
  }
);
