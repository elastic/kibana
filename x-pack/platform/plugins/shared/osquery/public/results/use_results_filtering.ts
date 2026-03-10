/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Query, Filter } from '@kbn/es-query';
import { FilterStateStore, escapeKuery } from '@kbn/es-query';

export interface UseResultsFilteringOptions {
  enabled: boolean;
  dataView: DataView | undefined;
  actionId: string;
}

export interface UseResultsFilteringResult {
  query: Query;
  filters: Filter[];
  kuery: string | undefined;
  filtersForSuggestions: Filter[];
  handleQuerySubmit: (payload: { query?: Query }) => void;
  handleFiltersUpdated: (filters: Filter[]) => void;
  handleFilter: (field: DataViewField, values: unknown, operation: '+' | '-') => void;
}

export const useResultsFiltering = (
  options: UseResultsFilteringOptions,
  onResetPagination: () => void
): UseResultsFilteringResult => {
  const { enabled, dataView, actionId } = options;

  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [filters, setFilters] = useState<Filter[]>([]);

  const kuery = useMemo(() => {
    if (!enabled) return undefined;

    const parts: string[] = [];

    if (query.query && typeof query.query === 'string' && query.query.trim()) {
      parts.push(query.query.trim());
    }

    for (const filter of filters) {
      if (filter.meta?.disabled) continue;

      const { key, params, negate } = filter.meta ?? {};
      if (!key) continue;

      let filterKql: string | undefined;
      if (filter.meta?.type === 'phrase' || filter.meta?.type === 'phrases') {
        const value = (params as { query?: string })?.query ?? params;
        if (value !== undefined && value !== null) {
          const escapedValue =
            typeof value === 'string' ? `"${escapeKuery(value)}"` : String(value);
          filterKql = `${key}: ${escapedValue}`;
        }
      } else if (filter.query) {
        const matchValue = filter.query?.match?.[key] ?? filter.query?.match_phrase?.[key];
        if (matchValue !== undefined) {
          const val = typeof matchValue === 'object' ? matchValue.query : matchValue;
          const escapedVal = typeof val === 'string' ? `"${escapeKuery(val)}"` : String(val);
          filterKql = `${key}: ${escapedVal}`;
        }
      }

      if (filterKql) {
        parts.push(negate ? `NOT ${filterKql}` : filterKql);
      }
    }

    return parts.length > 0 ? parts.join(' AND ') : undefined;
  }, [enabled, query, filters]);

  const filtersForSuggestions = useMemo<Filter[]>(
    () => [
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
    ],
    [actionId, dataView?.id]
  );

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

      const fieldExistsInDataView = dataView?.fields.getByName(field.name) !== undefined;

      const newFilter: Filter = {
        meta: {
          ...(fieldExistsInDataView && dataView?.id ? { index: dataView.id } : {}),
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
    kuery,
    filtersForSuggestions,
    handleQuerySubmit,
    handleFiltersUpdated,
    handleFilter,
  };
};
