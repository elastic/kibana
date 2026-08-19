/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BULK_FILTER_MAX_RULES } from '@kbn/alerting-v2-schemas';
import { useBulkSelect } from './use_bulk_select';

const pageItems = [{ id: 'rule-1' }];

describe('useBulkSelect', () => {
  it('reports the full logical count in select-all mode without an artificial cap', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: BULK_FILTER_MAX_RULES + 500,
        items: pageItems,
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.selectedCount).toBe(BULK_FILTER_MAX_RULES + 500);
  });

  it('does not cap selectedCount when total is at or below BULK_FILTER_MAX_RULES', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: BULK_FILTER_MAX_RULES,
        items: pageItems,
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.selectedCount).toBe(BULK_FILTER_MAX_RULES);
  });

  it('subtracts exclusions from the select-all logical count', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: BULK_FILTER_MAX_RULES + 1000,
        items: pageItems,
      })
    );

    act(() => {
      result.current.onSelectAll();
    });
    expect(result.current.selectedCount).toBe(BULK_FILTER_MAX_RULES + 1000);

    act(() => {
      for (let i = 0; i < 1500; i++) {
        result.current.onSelectRow(`ex-${i}`);
      }
    });

    const logical = BULK_FILTER_MAX_RULES + 1000 - 1500;
    expect(result.current.selectedCount).toBe(logical);
  });

  it('returns match_all params when select-all with no filter or search', () => {
    const { result } = renderHook(() => useBulkSelect({ totalItemCount: 10, items: pageItems }));

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getBulkParams()).toEqual({ match_all: true });
  });

  it('scopes select-all bulk params to filter', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: 10,
        items: pageItems,
        filter: 'enabled: true',
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getBulkParams()).toEqual({ filter: '(enabled: true)' });
  });

  it('passes search as a separate field in bulk params', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: 10,
        items: pageItems,
        search: 'prod',
      })
    );

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getBulkParams()).toEqual({ search: 'prod' });
  });

  it('passes filter and search as separate fields with exclusions', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: 10,
        items: pageItems,
        filter: 'enabled: true',
        search: 'x',
      })
    );

    act(() => {
      result.current.onSelectAll();
    });
    act(() => {
      result.current.onSelectRow('rule-1');
    });

    expect(result.current.getBulkParams()).toEqual({
      filter: '(enabled: true) AND NOT (id: "rule-1")',
      search: 'x',
    });
  });

  it('includes only exclusion clauses in filter when no structural filter is set', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: 10,
        items: pageItems,
        search: 'prod',
      })
    );

    act(() => {
      result.current.onSelectAll();
    });
    act(() => {
      result.current.onSelectRow('rule-1');
    });

    expect(result.current.getBulkParams()).toEqual({
      filter: 'NOT (id: "rule-1")',
      search: 'prod',
    });
  });

  it('returns zero selectedCount when totalItemCount is zero', () => {
    const { result } = renderHook(() => useBulkSelect({ totalItemCount: 0, items: [] }));

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.selectedCount).toBe(0);
  });

  it('counts the full inclusion set across pages, not only the visible page', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useBulkSelect({ totalItemCount: 40, items }),
      { initialProps: { items: [{ id: 'rule-1' }, { id: 'rule-2' }] } }
    );

    act(() => {
      result.current.onSelectRow('rule-1');
      result.current.onSelectRow('rule-2');
    });
    expect(result.current.selectedCount).toBe(2);

    // Navigate to another page — previously selected IDs must still count.
    rerender({ items: [{ id: 'rule-3' }, { id: 'rule-4' }] });
    expect(result.current.selectedCount).toBe(2);

    act(() => {
      result.current.onSelectRow('rule-3');
    });
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.getBulkParams()).toEqual({
      ids: expect.arrayContaining(['rule-1', 'rule-2', 'rule-3']),
    });
  });

  it('clears selection when the filter scope changes', () => {
    const { result, rerender } = renderHook(
      ({ filter }) =>
        useBulkSelect({
          totalItemCount: 50,
          items: pageItems,
          filter,
        }),
      { initialProps: { filter: undefined as string | undefined } }
    );

    act(() => {
      result.current.onSelectAll();
      result.current.onSelectRow('rule-1');
    });
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.selectedCount).toBe(49);

    rerender({ filter: 'enabled: false' });

    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.getBulkParams()).toEqual({ ids: [] });
  });

  it('clears selection when the search scope changes', () => {
    const { result, rerender } = renderHook(
      ({ search }) =>
        useBulkSelect({
          totalItemCount: 10,
          items: pageItems,
          search,
        }),
      { initialProps: { search: undefined as string | undefined } }
    );

    act(() => {
      result.current.onSelectRow('rule-1');
    });
    expect(result.current.selectedCount).toBe(1);

    rerender({ search: 'prod' });

    expect(result.current.selectedCount).toBe(0);
  });

  it('does not clear selection when only the visible page changes', () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        useBulkSelect({
          totalItemCount: 40,
          items,
          filter: 'kind: alert',
          search: 'host',
        }),
      { initialProps: { items: [{ id: 'rule-1' }] } }
    );

    act(() => {
      result.current.onSelectRow('rule-1');
    });

    rerender({ items: [{ id: 'rule-21' }] });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.getBulkParams()).toEqual({ ids: ['rule-1'] });
  });

  it('clamps select-all selectedCount at zero when exclusions exceed total', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: 3,
        items: pageItems,
      })
    );

    act(() => {
      result.current.onSelectAll();
      for (let i = 0; i < 10; i++) {
        result.current.onSelectRow(`ex-${i}`);
      }
    });

    expect(result.current.selectedCount).toBe(0);
  });
});
