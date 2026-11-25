/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useEsqlQueryExecution } from './use_esql_query_execution';

const mockEsql = jest.fn();

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({ services: { data: { search: { esql: mockEsql } } } }),
}));

const runParams = {
  query: 'FROM logs | STATS c = COUNT(*) BY t = BUCKET(@timestamp, 1 hour)',
  timeField: '',
  timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
};

describe('useEsqlQueryExecution', () => {
  beforeEach(() => {
    mockEsql.mockReset();
  });

  it('restores the latest results when mounted again with the same cache key', async () => {
    mockEsql.mockResolvedValue({
      rawResponse: {
        columns: [{ name: 'c', type: 'long' }],
        values: [[3]],
      },
    });
    const cacheKey = {};

    const first = renderHook(() => useEsqlQueryExecution(cacheKey));
    expect(first.result.current.hasRun).toBe(false);
    await act(async () => {
      await first.result.current.run(runParams);
    });
    first.unmount();

    const { result } = renderHook(() => useEsqlQueryExecution(cacheKey));
    expect(result.current.hasRun).toBe(true);
    expect(result.current.columns).toEqual([{ id: 'c', displayAsText: 'c', esType: 'long' }]);
    expect(result.current.rows).toEqual([{ c: '3' }]);
    expect(result.current.error).toBeNull();
    expect(mockEsql).toHaveBeenCalledTimes(1);
  });

  it('restores the latest error', async () => {
    mockEsql.mockRejectedValue(new Error('Unknown column [x]'));
    const cacheKey = {};

    const first = renderHook(() => useEsqlQueryExecution(cacheKey));
    await act(async () => {
      await first.result.current.run(runParams);
    });
    first.unmount();

    const { result } = renderHook(() => useEsqlQueryExecution(cacheKey));
    expect(result.current.error).toBe('Unknown column [x]');
    expect(result.current.rows).toEqual([]);
  });

  it('starts empty for a different cache key', () => {
    const { result } = renderHook(() => useEsqlQueryExecution({}));

    expect(result.current.hasRun).toBe(false);
    expect(result.current.rows).toEqual([]);
  });
});
