/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultGroupBy, getGroupByColumnsFromQuery } from './use_default_group_by';

describe('getGroupByColumnsFromQuery', () => {
  it('returns empty array for empty query', () => {
    expect(getGroupByColumnsFromQuery('')).toEqual([]);
  });

  it('returns empty array for query without STATS command', () => {
    expect(getGroupByColumnsFromQuery('FROM logs-* | WHERE status = 200')).toEqual([]);
  });

  it('returns empty array for STATS without BY clause', () => {
    expect(getGroupByColumnsFromQuery('FROM logs-* | STATS count()')).toEqual([]);
  });

  it('extracts single column from BY clause', () => {
    const query = 'FROM logs-* | STATS count() BY host.name';
    expect(getGroupByColumnsFromQuery(query)).toEqual(['host.name']);
  });

  it('extracts multiple columns from BY clause', () => {
    const query = 'FROM logs-* | STATS count() BY host.name, service.name';
    expect(getGroupByColumnsFromQuery(query)).toEqual(['host.name', 'service.name']);
  });

  it('extracts columns from the last STATS BY clause when multiple exist', () => {
    const query = 'FROM logs-* | STATS count() BY host.name | STATS sum(count) BY region';
    const result = getGroupByColumnsFromQuery(query);

    // Should only contain columns from the LAST stats command
    expect(result).toEqual(['region']);
    // Should NOT contain columns from the first stats command
    expect(result).not.toContain('host.name');
  });

  it('targets the last STATS command with multiple columns', () => {
    const query =
      'FROM logs-* | STATS count() BY first_field, second_field | STATS avg(count) BY last_field_a, last_field_b';
    const result = getGroupByColumnsFromQuery(query);

    // Should contain only columns from the last STATS command
    expect(result).toEqual(['last_field_a', 'last_field_b']);
    // Should NOT contain columns from the first STATS command
    expect(result).not.toContain('first_field');
    expect(result).not.toContain('second_field');
  });

  it('handles three or more STATS commands and targets the last one', () => {
    const query =
      'FROM logs-* | STATS count() BY a | STATS sum(count) BY b | STATS max(sum) BY final_group';
    const result = getGroupByColumnsFromQuery(query);

    expect(result).toEqual(['final_group']);
    expect(result).not.toContain('a');
    expect(result).not.toContain('b');
  });

  it('returns empty array for invalid query', () => {
    expect(getGroupByColumnsFromQuery('INVALID QUERY SYNTAX')).toEqual([]);
  });

  // Note: BUCKET function is not supported by getESQLStatsQueryMeta (cascade-specific limitation)
  // Queries with BUCKET in the BY clause return empty arrays
  it('returns empty array for query with BUCKET function in BY clause', () => {
    const query = 'FROM logs-* | STATS count() BY BUCKET(@timestamp, 1h)';
    const result = getGroupByColumnsFromQuery(query);
    expect(result).toEqual([]);
  });

  it('returns empty array when BY clause contains BUCKET function mixed with columns', () => {
    const query = 'FROM logs-* | STATS count() BY host.name, BUCKET(@timestamp, 1h)';
    const result = getGroupByColumnsFromQuery(query);
    // BUCKET invalidates the entire grouping for the cascade experience
    expect(result).toEqual([]);
  });
});

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
