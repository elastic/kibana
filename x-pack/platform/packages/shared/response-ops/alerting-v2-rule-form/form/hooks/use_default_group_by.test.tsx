/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultGroupBy } from './use_default_group_by';

describe('useDefaultGroupBy', () => {
  it('returns empty array for empty query', () => {
    const { result } = renderHook(() => useDefaultGroupBy({ query: '' }));
    expect(result.current.defaultGroupBy).toEqual([]);
  });

  it('returns group by columns from query', () => {
    const { result } = renderHook(() =>
      useDefaultGroupBy({ query: 'FROM logs-* | STATS count() BY host.name' })
    );
    expect(result.current.defaultGroupBy).toEqual(['host.name']);
  });

  it('memoizes the result', () => {
    const query = 'FROM logs-* | STATS count() BY host.name';
    const { result, rerender } = renderHook(() => useDefaultGroupBy({ query }));

    const firstResult = result.current.defaultGroupBy;
    rerender();
    const secondResult = result.current.defaultGroupBy;

    expect(firstResult).toBe(secondResult);
  });

  it('updates when query changes', () => {
    const { result, rerender } = renderHook(({ query }) => useDefaultGroupBy({ query }), {
      initialProps: { query: 'FROM logs-* | STATS count() BY host.name' },
    });

    expect(result.current.defaultGroupBy).toEqual(['host.name']);

    rerender({ query: 'FROM logs-* | STATS count() BY service.name, region' });

    expect(result.current.defaultGroupBy).toEqual(['service.name', 'region']);
  });
});
