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
  it('caps selectedCount at BULK_FILTER_MAX_RULES when select-all and total exceeds cap', () => {
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
    expect(result.current.selectedCount).toBe(BULK_FILTER_MAX_RULES);
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

  it('uses logical count when exclusions bring match set below bulk cap', () => {
    const { result } = renderHook(() =>
      useBulkSelect({
        totalItemCount: BULK_FILTER_MAX_RULES + 1000,
        items: pageItems,
      })
    );

    act(() => {
      result.current.onSelectAll();
    });
    expect(result.current.selectedCount).toBe(BULK_FILTER_MAX_RULES);

    act(() => {
      for (let i = 0; i < 1500; i++) {
        result.current.onSelectRow(`ex-${i}`);
      }
    });

    const logical = BULK_FILTER_MAX_RULES + 1000 - 1500;
    expect(result.current.selectedCount).toBe(logical);
  });

  it('returns match-all filter when select-all with no exclusions', () => {
    const { result } = renderHook(() => useBulkSelect({ totalItemCount: 10, items: pageItems }));

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.getBulkParams()).toEqual({ filter: '' });
  });

  it('scopes select-all bulk filter to filter', () => {
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

    expect(result.current.getBulkParams()).toEqual({ filter: 'enabled: true' });
  });

  it('scopes select-all bulk filter to search', () => {
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

    expect(result.current.getBulkParams()).toEqual({
      filter: '(metadata.name: prod* OR metadata.tags: prod*)',
    });
  });

  it('combines list scope with NOT exclusions when select-all with deselected rows', () => {
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
      filter:
        '((enabled: true) AND ((metadata.name: x* OR metadata.tags: x*))) AND NOT (id: "rule-1")',
    });
  });

  it('returns zero selectedCount when totalItemCount is zero', () => {
    const { result } = renderHook(() => useBulkSelect({ totalItemCount: 0, items: [] }));

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.selectedCount).toBe(0);
  });
});
