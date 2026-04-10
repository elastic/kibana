/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { isOfQueryType, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type { DashboardState } from '@kbn/dashboard-plugin/server';
import { DEFAULT_TIME_RANGE } from '@kbn/dashboard-agent-common';

interface DashboardPreviewUnifiedSearchState {
  filters: Filter[];
  query?: Query;
  timeRange: TimeRange;
}

const persistedStateByAttachmentId = new Map<string, DashboardPreviewUnifiedSearchState>();

export const getPersistedState = (attachmentId: string) =>
  persistedStateByAttachmentId.get(attachmentId);

export const setPersistedState = (
  attachmentId: string,
  state: DashboardPreviewUnifiedSearchState
) => {
  persistedStateByAttachmentId.set(attachmentId, state);
};

export const clearUnifiedSearchPersistedState = (attachmentId: string) => {
  persistedStateByAttachmentId.delete(attachmentId);
};

const usePersistedState = (attachmentId: string) => {
  const persistedState = useMemo(() => getPersistedState(attachmentId), [attachmentId]);
  const onStateChange = useCallback(
    (state: DashboardPreviewUnifiedSearchState) => {
      setPersistedState(attachmentId, state);
    },
    [attachmentId]
  );

  return {
    persistedState,
    onStateChange,
  };
};

interface UseDashboardPreviewUnifiedSearchParams {
  attachmentId: string;
  dashboardApi: DashboardApi | undefined;
  dashboardState: DashboardState;
  filterManager: DataPublicPluginStart['query']['filterManager'];
}

export const useDashboardPreviewUnifiedSearch = ({
  attachmentId,
  dashboardApi,
  dashboardState,
  filterManager,
}: UseDashboardPreviewUnifiedSearchParams) => {
  const { persistedState, onStateChange } = usePersistedState(attachmentId);
  const initialQuery = useMemo(() => toStoredQuery(dashboardState.query), [dashboardState.query]);
  const initialFilters = useMemo(
    () => toStoredFilters(dashboardState.filters) ?? [],
    [dashboardState.filters]
  );
  const initialTimeRange = useMemo<TimeRange>(
    () => dashboardState.time_range ?? DEFAULT_TIME_RANGE,
    [dashboardState.time_range]
  );

  const [timeRange, setTimeRange] = useState<TimeRange>(
    persistedState?.timeRange ?? initialTimeRange
  );
  const [query, setQuery] = useState<Query | undefined>(persistedState?.query ?? initialQuery);
  const [filters, setFilters] = useState<Filter[]>(persistedState?.filters ?? initialFilters);
  const [dataViews, setDataViews] = useState<DataView[]>([]);

  const normalizeQuery = useCallback((nextQuery: Query | undefined) => {
    if (!nextQuery) {
      return undefined;
    }

    if (typeof nextQuery.query !== 'string') {
      return nextQuery;
    }

    return nextQuery.query.trim() === '' ? undefined : nextQuery;
  }, []);

  useEffect(() => {
    setQuery(persistedState?.query ?? initialQuery);
    setFilters(persistedState?.filters ?? initialFilters);
    setTimeRange(persistedState?.timeRange ?? initialTimeRange);
  }, [attachmentId, initialFilters, initialQuery, initialTimeRange, persistedState]);

  useEffect(() => {
    onStateChange?.({
      filters,
      query,
      timeRange,
    });
  }, [filters, onStateChange, query, timeRange]);

  useEffect(() => {
    const filterManagerSubscription = filterManager.getUpdates$().subscribe(() => {
      const nextFilters = filterManager.getFilters();
      setFilters((currentFilters) =>
        isEqual(currentFilters, nextFilters) ? currentFilters : nextFilters
      );
    });

    return () => {
      filterManagerSubscription.unsubscribe();
    };
  }, [filterManager]);

  useEffect(() => {
    if (!dashboardApi) {
      return;
    }

    dashboardApi.setQuery(query);
  }, [dashboardApi, query]);

  useEffect(() => {
    if (!dashboardApi) {
      return;
    }

    dashboardApi.setFilters(filters);
  }, [dashboardApi, filters]);

  useEffect(() => {
    if (!dashboardApi) {
      return;
    }

    dashboardApi.setTimeRange(timeRange);
  }, [dashboardApi, timeRange]);

  useEffect(() => {
    if (!dashboardApi) {
      setDataViews([]);
      return;
    }

    setDataViews(dashboardApi.dataViews$.value ?? []);

    const querySubscription = dashboardApi.query$.subscribe((nextQuery) => {
      const resolvedQuery = normalizeQuery(
        nextQuery && isOfQueryType(nextQuery) ? nextQuery : undefined
      );
      setQuery((currentQuery) =>
        isEqual(currentQuery, resolvedQuery) ? currentQuery : resolvedQuery
      );
    });
    const dataViewsSubscription = dashboardApi.dataViews$.subscribe((nextDataViews) => {
      const resolvedDataViews = nextDataViews ?? [];
      setDataViews((currentDataViews) =>
        isEqual(currentDataViews, resolvedDataViews) ? currentDataViews : resolvedDataViews
      );
    });
    const filtersSubscription = dashboardApi.filters$.subscribe((nextFilters) => {
      const resolvedFilters = nextFilters ?? [];
      setFilters((currentFilters) =>
        isEqual(currentFilters, resolvedFilters) ? currentFilters : resolvedFilters
      );
    });
    const timeRangeSubscription = dashboardApi.timeRange$.subscribe((nextTimeRange) => {
      if (!nextTimeRange) {
        return;
      }

      setTimeRange((currentTimeRange) =>
        isEqual(currentTimeRange, nextTimeRange) ? currentTimeRange : nextTimeRange
      );
    });

    return () => {
      querySubscription.unsubscribe();
      dataViewsSubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      timeRangeSubscription.unsubscribe();
    };
  }, [dashboardApi, normalizeQuery]);

  const onQuerySubmit = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      const resolvedQuery = normalizeQuery(nextQuery);
      setTimeRange(dateRange);
      setQuery(resolvedQuery);
      dashboardApi?.setTimeRange(dateRange);
      dashboardApi?.setQuery(resolvedQuery);
      dashboardApi?.forceRefresh();
    },
    [dashboardApi, normalizeQuery]
  );

  const onFiltersUpdated = useCallback(
    (nextFilters: Filter[]) => {
      setFilters(nextFilters);
      filterManager.setFilters(nextFilters);
    },
    [filterManager]
  );

  const onRefresh = useCallback(() => {
    dashboardApi?.forceRefresh();
  }, [dashboardApi]);

  const searchBarProps = useMemo(
    () => ({
      appName: 'dashboardAgent',
      isAutoRefreshDisabled: true,
      showQueryInput: true,
      showDatePicker: true,
      showFilterBar: true,
      showQueryMenu: false,
      query,
      filters,
      indexPatterns: dataViews,
      screenTitle: dashboardState.title,
      displayStyle: 'inPage' as const,
      useDefaultBehaviors: true,
      disableQueryLanguageSwitcher: true,
      isDisabled: !dashboardApi,
      dateRangeFrom: timeRange.from,
      dateRangeTo: timeRange.to,
      onQuerySubmit,
      onFiltersUpdated,
      onRefresh,
      dataTestSubj: 'dashboardCanvasSearchBar',
    }),
    [
      dashboardApi,
      dashboardState.title,
      dataViews,
      filters,
      onFiltersUpdated,
      onQuerySubmit,
      onRefresh,
      query,
      timeRange.from,
      timeRange.to,
    ]
  );

  return {
    dataViews,
    filters,
    query,
    searchBarProps,
    timeRange,
  };
};
