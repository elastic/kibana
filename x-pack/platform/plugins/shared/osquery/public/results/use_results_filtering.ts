/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Query, Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';

export interface UseResultsFilteringOptions {
  enabled: boolean;
  dataView: DataView | undefined;
  actionId: string;
  scheduleId?: string;
  executionCount?: number;
}

export interface UseResultsFilteringResult {
  query: Query;
  filters: Filter[];
  userKuery: string | undefined;
  activeFilters: Filter[];
  filtersForSuggestions: Filter[];
  handleQuerySubmit: (payload: { query?: Query }) => void;
  handleFiltersUpdated: (filters: Filter[]) => void;
  handleFilter: (field: DataViewField, values: unknown, operation: '+' | '-') => void;
}

export const useResultsFiltering = (
  options: UseResultsFilteringOptions,
  onResetPagination: () => void
): UseResultsFilteringResult => {
  const { enabled, dataView, actionId, scheduleId, executionCount } = options;
  const isScheduled = !!scheduleId && executionCount != null;

  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [filters, setFilters] = useState<Filter[]>([]);

  const userKuery = useMemo(() => {
    if (!enabled) return undefined;
    if (query.query && typeof query.query === 'string' && query.query.trim()) {
      return query.query.trim();
    }

    return undefined;
  }, [enabled, query]);

  const activeFilters = useMemo(() => filters.filter((f) => !f.meta?.disabled), [filters]);

  const filtersForSuggestions = useMemo<Filter[]>(() => {
    if (isScheduled) {
      return [
        {
          meta: {
            index: dataView?.id,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'schedule_id',
            params: { query: scheduleId },
          },
          query: { match_phrase: { schedule_id: scheduleId } },
          $state: { store: FilterStateStore.APP_STATE },
        },
        {
          meta: {
            index: dataView?.id,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'osquery_meta.schedule_execution_count',
            params: { query: executionCount },
          },
          query: {
            match_phrase: { 'osquery_meta.schedule_execution_count': executionCount },
          },
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];
    }

    return [
      {
        meta: {
          index: dataView?.id,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'action_id',
          params: { query: actionId },
        },
        query: { match_phrase: { action_id: actionId } },
        $state: { store: FilterStateStore.APP_STATE },
      },
    ];
  }, [isScheduled, scheduleId, executionCount, actionId, dataView?.id]);

  const handleQuerySubmit = useCallback(
    (payload: { query?: Query }) => {
      if (payload.query) {
        setQuery(payload.query);
      }

      onResetPagination();
    },
    [onResetPagination]
  );

  const handleFiltersUpdated = useCallback(
    (updatedFilters: Filter[]) => {
      setFilters(updatedFilters);
      onResetPagination();
    },
    [onResetPagination]
  );

  const handleFilter = useCallback(
    (field: DataViewField, values: unknown, operation: '+' | '-') => {
      const value = Array.isArray(values) ? values[0] : values;
      const stringValue = typeof value === 'string' ? value : String(value);

      const newFilter: Filter = {
        meta: {
          ...(dataView?.id ? { index: dataView.id } : {}),
          key: field.name,
          value: stringValue,
          params: { query: value },
          type: 'phrase',
          negate: operation === '-',
          disabled: false,
        },
        query: {
          match_phrase: {
            [field.name]: value,
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      };

      setFilters((prev) => [...prev, newFilter]);
      onResetPagination();
    },
    [dataView, onResetPagination]
  );

  return {
    query,
    filters,
    userKuery,
    activeFilters,
    filtersForSuggestions,
    handleQuerySubmit,
    handleFiltersUpdated,
    handleFilter,
  };
};
