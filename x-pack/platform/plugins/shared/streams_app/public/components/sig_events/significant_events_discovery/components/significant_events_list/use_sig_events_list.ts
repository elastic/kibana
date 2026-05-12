/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { Verdict, Impact, SigEvent } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

const SEARCH_DEBOUNCE_MS = 300;

export interface SigEventsFilters {
  verdict: Verdict[];
  impact: Impact[];
  stream: string[];
  search: string;
}

export interface SigEventsPagination {
  page: number;
  perPage: number;
}

export interface SigEventsSort {
  field: keyof SigEvent;
  direction: 'asc' | 'desc';
}

const DEFAULT_FILTERS: SigEventsFilters = {
  verdict: [],
  impact: [],
  stream: [],
  search: '',
};

const DEFAULT_PAGINATION: SigEventsPagination = {
  page: 1,
  perPage: 25,
};

const DEFAULT_SORT: SigEventsSort = {
  field: '@timestamp',
  direction: 'desc',
};

export const useSigEventsList = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [filters, setFilters] = useState<SigEventsFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState<SigEventsPagination>(DEFAULT_PAGINATION);
  const [sort, setSort] = useState<SigEventsSort>(DEFAULT_SORT);

  const { verdict, impact, stream } = filters;
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const { page, perPage } = pagination;
  const { field: sortField, direction: sortDirection } = sort;

  const fetchState = useStreamsAppFetch(
    async ({ signal, timeState }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/sig_events/list', {
        params: {
          query: {
            page,
            perPage,
            sortField,
            sortDirection,
            ...(verdict.length > 0 && { verdict }),
            ...(impact.length > 0 && { impact }),
            ...(stream.length > 0 && { stream }),
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(timeState && {
              from: timeState.asAbsoluteTimeRange.from,
              to: timeState.asAbsoluteTimeRange.to,
            }),
          },
        },
        signal,
      });
    },
    [
      streamsRepositoryClient,
      page,
      perPage,
      sortField,
      sortDirection,
      verdict,
      impact,
      stream,
      debouncedSearch,
    ],
    { withTimeRange: true, withRefresh: true }
  );

  const onTableChange = useCallback(
    ({
      page: tablePage,
      sort: tableSort,
    }: {
      page?: { index: number; size: number };
      sort?: { field: keyof SigEvent; direction: 'asc' | 'desc' };
    }) => {
      if (tablePage) {
        setPagination({ page: tablePage.index + 1, perPage: tablePage.size });
      }
      if (tableSort) {
        setSort({ field: tableSort.field, direction: tableSort.direction });
      }
    },
    []
  );

  const onFilterChange = useCallback((newFilters: Partial<SigEventsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination(DEFAULT_PAGINATION);
  }, []);

  return {
    events: fetchState.value?.events ?? [],
    total: fetchState.value?.total ?? 0,
    loading: fetchState.loading,
    error: fetchState.error,
    filters,
    pagination,
    sort,
    onTableChange,
    onFilterChange,
  };
};
