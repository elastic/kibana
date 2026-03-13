/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { useResultsFiltering } from './use_results_filtering';

const createMockDataView = (id = 'test-dv-id'): DataView =>
  ({
    id,
    fields: {
      getByName: jest.fn((name: string) =>
        name === 'agent.name' ? ({ name: 'agent.name' } as DataViewField) : undefined
      ),
      filter: jest.fn().mockReturnValue([]),
      length: 0,
    },
  } as unknown as DataView);

describe('useResultsFiltering', () => {
  const resetPagination = jest.fn();

  const defaultOptions = {
    enabled: true,
    dataView: createMockDataView(),
    actionId: 'action-123',
  };

  beforeEach(() => {
    resetPagination.mockClear();
  });

  it('returns initial empty state', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    expect(result.current.query).toEqual({ query: '', language: 'kuery' });
    expect(result.current.filters).toEqual([]);
    expect(result.current.userKuery).toBeUndefined();
    expect(result.current.activeFilters).toEqual([]);
  });

  it('returns undefined userKuery when disabled', () => {
    const { result } = renderHook(() =>
      useResultsFiltering({ ...defaultOptions, enabled: false }, resetPagination)
    );

    expect(result.current.userKuery).toBeUndefined();
  });

  it('updates userKuery on query submit', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    act(() => {
      result.current.handleQuerySubmit({
        query: { query: 'agent.name: "host-1"', language: 'kuery' },
      });
    });

    expect(result.current.userKuery).toBe('agent.name: "host-1"');
    expect(resetPagination).toHaveBeenCalledTimes(1);
  });

  it('adds positive filter via handleFilter', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    act(() => {
      result.current.handleFilter({ name: 'agent.name' } as DataViewField, 'test-host', '+');
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].meta.negate).toBe(false);
    expect(result.current.filters[0].meta.type).toBe('phrase');
    expect(result.current.activeFilters).toHaveLength(1);
    expect(resetPagination).toHaveBeenCalled();
  });

  it('adds negated filter via handleFilter', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    act(() => {
      result.current.handleFilter({ name: 'agent.name' } as DataViewField, 'test-host', '-');
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].meta.negate).toBe(true);
    expect(result.current.activeFilters).toHaveLength(1);
  });

  it('sets userKuery independently of filters', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    act(() => {
      result.current.handleQuerySubmit({
        query: { query: 'osquery.name: "users"', language: 'kuery' },
      });
    });

    act(() => {
      result.current.handleFilter({ name: 'agent.name' } as DataViewField, 'host-1', '+');
    });

    expect(result.current.userKuery).toBe('osquery.name: "users"');
    expect(result.current.activeFilters).toHaveLength(1);
  });

  it('excludes disabled filters from activeFilters', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    act(() => {
      result.current.handleFilter({ name: 'agent.name' } as DataViewField, 'host-1', '+');
    });

    act(() => {
      result.current.handleFiltersUpdated(
        result.current.filters.map((f) => ({
          ...f,
          meta: { ...f.meta, disabled: true },
        }))
      );
    });

    expect(result.current.activeFilters).toHaveLength(0);
  });

  it('provides filtersForSuggestions scoped to actionId', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    expect(result.current.filtersForSuggestions).toHaveLength(1);
    expect(result.current.filtersForSuggestions[0].meta.key).toBe('action_id');
    expect(result.current.filtersForSuggestions[0].query).toEqual({
      match_phrase: { action_id: 'action-123' },
    });
  });

  it('handleFiltersUpdated replaces all filters and resets pagination', () => {
    const { result } = renderHook(() => useResultsFiltering(defaultOptions, resetPagination));

    const newFilters = [
      {
        meta: { key: 'test', type: 'phrase' as const, negate: false, disabled: false },
        query: { match_phrase: { test: 'value' } },
      },
    ];

    act(() => {
      result.current.handleFiltersUpdated(newFilters);
    });

    expect(result.current.filters).toEqual(newFilters);
    expect(resetPagination).toHaveBeenCalled();
  });
});
