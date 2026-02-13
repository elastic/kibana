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
      name: '',
      description: '',
      tags: [],
      schedule: { custom: '5m' },
      lookbackWindow: '5m',
      timeField: '',
      enabled: true,
      query: '',
      groupingKey: [],
    });
  });

  it('uses provided defaultTimeField', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: '', defaultTimeField: '@timestamp' })
    );

    expect(result.current.timeField).toBe('@timestamp');
  });

  it('extracts groupingKey from STATS BY clause', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | STATS count() BY host.name' })
    );

    expect(result.current.groupingKey).toEqual(['host.name']);
  });

  it('extracts multiple groupingKey columns', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | STATS count() BY host.name, service.name' })
    );

    expect(result.current.groupingKey).toEqual(['host.name', 'service.name']);
  });

  it('includes the query in returned values', () => {
    const query = 'FROM logs-* | STATS count() BY host.name';
    const { result } = renderHook(() => useFormDefaults({ query }));

    expect(result.current.query).toBe(query);
  });

  it('returns empty groupingKey for query without STATS BY', () => {
    const { result } = renderHook(() =>
      useFormDefaults({ query: 'FROM logs-* | WHERE status = 200' })
    );

    expect(result.current.groupingKey).toEqual([]);
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

    expect(result.current.groupingKey).toEqual(['host.name']);
    expect(result.current.query).toBe('FROM logs-* | STATS count() BY host.name');

    rerender({ query: 'FROM logs-* | STATS count() BY service.name' });

    expect(result.current.groupingKey).toEqual(['service.name']);
    expect(result.current.query).toBe('FROM logs-* | STATS count() BY service.name');
  });

  it('updates when defaultTimeField changes', () => {
    const { result, rerender } = renderHook(
      ({ query, defaultTimeField }) => useFormDefaults({ query, defaultTimeField }),
      { initialProps: { query: '', defaultTimeField: '@timestamp' } }
    );

    expect(result.current.timeField).toBe('@timestamp');

    rerender({ query: '', defaultTimeField: 'event.timestamp' });

    expect(result.current.timeField).toBe('event.timestamp');
  });
});
