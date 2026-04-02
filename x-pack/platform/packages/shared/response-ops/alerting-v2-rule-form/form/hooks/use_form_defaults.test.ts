/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFormDefaults } from './use_form_defaults';

describe('useFormDefaults', () => {
  it('returns default form values with empty query', () => {
    const { result } = renderHook(() => useFormDefaults({ query: '' }));

    expect(result.current).toEqual({
      kind: 'alert',
      metadata: {
        name: '',
        enabled: true,
        description: '',
      },
      timeField: '@timestamp', // Default to @timestamp; TimeFieldSelect may update if not available
      schedule: { every: '1m', lookback: '5m' },
      evaluation: {
        query: {
          base: '',
          condition: '',
        },
      },
      grouping: undefined,
      recoveryPolicy: {
        type: 'no_breach',
      },
      stateTransitionAlertDelayMode: 'immediate',
      stateTransitionRecoveryDelayMode: 'immediate',
    });
  });

  it('extracts grouping fields from STATS BY clause', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | STATS count() BY host.name' })
    );

    expect(result.current.grouping).toEqual({ fields: ['host.name'] });
  });

  it('extracts multiple grouping fields', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | STATS count() BY host.name, service.name' })
    );

    expect(result.current.grouping).toEqual({ fields: ['host.name', 'service.name'] });
  });

  it('includes the query in evaluation.query.base when no WHERE clause', () => {
    const query = 'FROM logs-* | STATS count() BY host.name';
    const { result } = renderHook(() => useFormDefaults({ query }));

    expect(result.current.evaluation.query.base).toBe(query);
    expect(result.current.evaluation.query.condition).toBe('');
  });

  it('splits query into base and condition when WHERE clause exists', () => {
    const query = 'FROM logs-* | STATS count() BY host.name | WHERE count > 100';
    const { result } = renderHook(() => useFormDefaults({ query }));

    expect(result.current.evaluation.query.base).toBe('FROM logs-* | STATS COUNT() BY host.name');
    expect(result.current.evaluation.query.condition).toBe('count > 100');
  });

  it('returns undefined grouping for query with WHERE but no STATS BY', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | WHERE status == 200' })
    );

    expect(result.current.grouping).toBeUndefined();
    // WHERE at the end gets split
    expect(result.current.evaluation.query.base).toBe('FROM logs-*');
    expect(result.current.evaluation.query.condition).toBe('status == 200');
  });

  it('memoizes the result', () => {
    const query = 'FROM logs-* | STATS count() BY host.name';
    const { result, rerender } = renderHook(() => useFormDefaults({ query }));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('updates when query changes', () => {
    const { result, rerender } = renderHook(({ query }) => useFormDefaults({ query }), {
      initialProps: { query: 'FROM logs-* | STATS count() BY host.name' },
    });

    expect(result.current.grouping).toEqual({ fields: ['host.name'] });
    expect(result.current.evaluation.query.base).toBe('FROM logs-* | STATS count() BY host.name');
    expect(result.current.evaluation.query.condition).toBe('');

    rerender({ query: 'FROM logs-* | STATS count() BY service.name | WHERE count > 50' });

    expect(result.current.grouping).toEqual({ fields: ['service.name'] });
    expect(result.current.evaluation.query.base).toBe(
      'FROM logs-* | STATS COUNT() BY service.name'
    );
    expect(result.current.evaluation.query.condition).toBe('count > 50');
  });
});
