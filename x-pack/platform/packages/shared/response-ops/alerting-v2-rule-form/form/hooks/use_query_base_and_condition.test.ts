/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQueryBaseAndCondition } from './use_query_base_and_condition';

describe('useQueryBaseAndCondition', () => {
  describe('basic functionality', () => {
    it('returns empty condition and original query as base for empty query', () => {
      const { result } = renderHook(() => useQueryBaseAndCondition({ query: '' }));

      expect(result.current.baseQuery).toBe('');
      expect(result.current.condition).toBe('');
      expect(result.current.hasSplit).toBe(false);
    });

    it('returns hasSplit false for query without WHERE clause', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'FROM logs-* | STATS count() BY host.name' })
      );

      expect(result.current.baseQuery).toBe('FROM logs-* | STATS count() BY host.name');
      expect(result.current.condition).toBe('');
      expect(result.current.hasSplit).toBe(false);
    });
  });

  describe('query splitting', () => {
    it('splits query with STATS and trailing WHERE', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({
          query: 'FROM logs-* | STATS count() BY host.name | WHERE count > 100',
        })
      );

      expect(result.current.baseQuery).toBe('FROM logs-* | STATS COUNT() BY host.name');
      expect(result.current.condition).toBe('count > 100');
      expect(result.current.hasSplit).toBe(true);
    });

    it('splits query with only WHERE (document-level)', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'FROM logs-* | WHERE status >= 500' })
      );

      expect(result.current.baseQuery).toBe('FROM logs-*');
      expect(result.current.condition).toBe('status >= 500');
      expect(result.current.hasSplit).toBe(true);
    });

    it('extracts only the last WHERE clause when multiple exist', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({
          query:
            'FROM logs-* | WHERE service.name == "api" | STATS count() BY host | WHERE count > 100',
        })
      );

      expect(result.current.baseQuery).toBe(
        'FROM logs-* | WHERE service.name == "api" | STATS COUNT() BY host'
      );
      expect(result.current.condition).toBe('count > 100');
      expect(result.current.hasSplit).toBe(true);
    });
  });

  describe('memoization', () => {
    it('memoizes the result for the same query', () => {
      const query = 'FROM logs-* | WHERE status >= 500';
      const { result, rerender } = renderHook(() => useQueryBaseAndCondition({ query }));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // Same reference means memoization is working
      expect(firstResult).toBe(secondResult);
    });

    it('updates when query changes', () => {
      const { result, rerender } = renderHook(({ query }) => useQueryBaseAndCondition({ query }), {
        initialProps: { query: 'FROM logs-* | WHERE status >= 500' },
      });

      expect(result.current.condition).toBe('status >= 500');
      expect(result.current.hasSplit).toBe(true);

      rerender({ query: 'FROM logs-* | WHERE error_count > 10' });

      expect(result.current.condition).toBe('error_count > 10');
      expect(result.current.hasSplit).toBe(true);
    });

    it('handles transition from query with WHERE to without', () => {
      const { result, rerender } = renderHook(({ query }) => useQueryBaseAndCondition({ query }), {
        initialProps: { query: 'FROM logs-* | WHERE status >= 500' },
      });

      expect(result.current.hasSplit).toBe(true);
      expect(result.current.condition).toBe('status >= 500');

      rerender({ query: 'FROM logs-* | STATS count()' });

      expect(result.current.hasSplit).toBe(false);
      expect(result.current.condition).toBe('');
      expect(result.current.baseQuery).toBe('FROM logs-* | STATS count()');
    });
  });

  describe('complex conditions', () => {
    it('handles AND conditions', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'FROM logs-* | WHERE status >= 400 AND status < 500' })
      );

      expect(result.current.condition).toBe('status >= 400 AND status < 500');
      expect(result.current.hasSplit).toBe(true);
    });

    it('handles OR conditions', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'FROM logs-* | WHERE status == 500 OR status == 503' })
      );

      expect(result.current.condition).toBe('status == 500 OR status == 503');
      expect(result.current.hasSplit).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles invalid query gracefully', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'INVALID QUERY SYNTAX' })
      );

      expect(result.current.baseQuery).toBe('INVALID QUERY SYNTAX');
      expect(result.current.condition).toBe('');
      expect(result.current.hasSplit).toBe(false);
    });

    it('handles query with string comparisons', () => {
      const { result } = renderHook(() =>
        useQueryBaseAndCondition({ query: 'FROM logs-* | WHERE level == "error"' })
      );

      expect(result.current.baseQuery).toBe('FROM logs-*');
      expect(result.current.condition).toBe('level == "error"');
      expect(result.current.hasSplit).toBe(true);
    });
  });
});
