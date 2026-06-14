/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { createFormWrapper } from '../../test_utils';
import { useRecoveryPreview } from './use_recovery_preview';

jest.mock('@kbn/esql-utils');
jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

const mockGetESQLResults = jest.mocked(getESQLResults);

const mockESQLResponse = {
  response: {
    columns: [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ],
    values: [
      ['host-1', '3'],
      ['host-2', '1'],
    ],
  },
};

describe('useRecoveryPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue(mockESQLResponse as any);
  });

  it('uses standalone recovery base query', async () => {
    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'query' as const,
        query: {
          base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
        },
      },
    });

    renderHook(() => useRecoveryPreview(), { wrapper });

    await waitFor(() => {
      expect(mockGetESQLResults).toHaveBeenCalled();
    });

    const call = mockGetESQLResults.mock.calls[0][0];
    expect(call.esqlQuery).toBe('FROM logs-* | STATS count() BY host.name | WHERE count < 5');
  });

  it('does not execute when recovery base query is empty', async () => {
    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'query' as const,
        query: {
          base: '',
        },
      },
    });

    const { result } = renderHook(() => useRecoveryPreview(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetESQLResults).not.toHaveBeenCalled();
  });

  it('does not execute when recovery type is no_breach', async () => {
    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'no_breach' as const,
        query: {
          base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
        },
      },
    });

    const { result } = renderHook(() => useRecoveryPreview(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetESQLResults).not.toHaveBeenCalled();
  });

  it('maps columns and rows from ES|QL response', async () => {
    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'query' as const,
        query: {
          base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
        },
      },
    });

    const { result } = renderHook(() => useRecoveryPreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.columns).toEqual([
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
      { id: 'count', displayAsText: 'count', esType: 'long' },
    ]);

    expect(result.current.rows).toEqual([
      { 'host.name': 'host-1', count: '3' },
      { 'host.name': 'host-2', count: '1' },
    ]);

    expect(result.current.totalRowCount).toBe(2);
  });

  it('passes grouping fields through', async () => {
    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'query' as const,
        query: {
          base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
        },
      },
      grouping: { fields: ['host.name'] },
    });

    const { result } = renderHook(() => useRecoveryPreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupingFields).toEqual(['host.name']);
    expect(result.current.uniqueGroupCount).toBe(2);
  });

  it('handles query errors gracefully', async () => {
    mockGetESQLResults.mockRejectedValue(new Error('Recovery query syntax error'));

    const wrapper = createFormWrapper({
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host.name',
        },
      },
      recoveryPolicy: {
        type: 'query' as const,
        query: {
          base: 'FROM logs-* | STATS count() BY host.name | WHERE count < 5',
        },
      },
    });

    const { result } = renderHook(() => useRecoveryPreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe('Recovery query syntax error');
  });
});
