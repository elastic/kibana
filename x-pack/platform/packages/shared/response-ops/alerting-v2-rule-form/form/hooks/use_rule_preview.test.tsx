/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { createFormWrapper } from '../../test_utils';
import { useRulePreview } from './use_rule_preview';

jest.mock('@kbn/esql-utils');
jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

const mockGetESQLResults = jest.mocked(getESQLResults);

const mockESQLResponse = {
  response: {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'keyword' },
      { name: 'host.name', type: 'keyword' },
    ],
    values: [
      ['2024-01-01T00:00:00Z', 'Error occurred', 'host-1'],
      ['2024-01-01T00:01:00Z', 'Warning issued', 'host-2'],
      ['2024-01-01T00:02:00Z', 'Info log', 'host-3'],
    ],
  },
};

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-* | LIMIT 100',
    },
  },
};

describe('useRulePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue(mockESQLResponse as any);
  });

  it('returns loading state initially when inputs are valid', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => useRulePreview(), { wrapper });

    // Should start loading since all inputs are provided
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('fetches and maps ESQL results to columns and rows', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => useRulePreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check columns
    expect(result.current.columns).toEqual([
      { id: '@timestamp', displayAsText: '@timestamp', esType: 'date' },
      { id: 'message', displayAsText: 'message', esType: 'keyword' },
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
    ]);

    // Check rows
    expect(result.current.rows).toEqual([
      { '@timestamp': '2024-01-01T00:00:00Z', message: 'Error occurred', 'host.name': 'host-1' },
      { '@timestamp': '2024-01-01T00:01:00Z', message: 'Warning issued', 'host.name': 'host-2' },
      { '@timestamp': '2024-01-01T00:02:00Z', message: 'Info log', 'host.name': 'host-3' },
    ]);

    expect(result.current.totalRowCount).toBe(3);
  });

  it('calls getESQLResults with correct parameters', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    renderHook(() => useRulePreview(), { wrapper });

    await waitFor(() => {
      expect(mockGetESQLResults).toHaveBeenCalled();
    });

    const call = mockGetESQLResults.mock.calls[0][0];
    expect(call.esqlQuery).toBe('FROM logs-* | LIMIT 100');
    expect(call.dropNullColumns).toBe(true);
    expect(call.timeRange).toBeDefined();
    expect(call.filter).toBeDefined();
  });

  it('does not execute when query is empty', async () => {
    const wrapper = createFormWrapper({
      ...defaultFormValues,
      evaluation: { query: { base: '' } },
    });

    const { result } = renderHook(() => useRulePreview(), { wrapper });

    // Should not be loading since the query is empty
    expect(result.current.isLoading).toBe(false);
    expect(result.current.columns).toEqual([]);
    expect(result.current.rows).toEqual([]);
    expect(mockGetESQLResults).not.toHaveBeenCalled();
  });

  it('does not execute when timeField is empty', async () => {
    const wrapper = createFormWrapper({
      ...defaultFormValues,
      timeField: '',
    });

    const { result } = renderHook(() => useRulePreview(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockGetESQLResults).not.toHaveBeenCalled();
  });

  it('handles null values in response', async () => {
    mockGetESQLResults.mockResolvedValue({
      response: {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'message', type: 'keyword' },
        ],
        values: [['2024-01-01T00:00:00Z', null]],
      },
    } as any);

    const wrapper = createFormWrapper(defaultFormValues);
    const { result } = renderHook(() => useRulePreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows[0].message).toBeNull();
  });

  it('handles query errors gracefully', async () => {
    mockGetESQLResults.mockRejectedValue(new Error('Query syntax error'));

    const wrapper = createFormWrapper(defaultFormValues);
    const { result } = renderHook(() => useRulePreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe('Query syntax error');
    expect(result.current.columns).toEqual([]);
    expect(result.current.rows).toEqual([]);
  });

  it('handles object values by serializing to JSON', async () => {
    mockGetESQLResults.mockResolvedValue({
      response: {
        columns: [{ name: 'data', type: 'object' }],
        values: [[{ key: 'value' }]],
      },
    } as any);

    const wrapper = createFormWrapper(defaultFormValues);
    const { result } = renderHook(() => useRulePreview(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rows[0].data).toBe('{"key":"value"}');
  });

  describe('query assembly with condition', () => {
    it('includes condition with WHERE prefix in the executed query', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: 'FROM logs-* | STATS count() BY host.name',
            condition: 'WHERE count > 100',
          },
        },
      });

      renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(mockGetESQLResults).toHaveBeenCalled();
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call.esqlQuery).toBe('FROM logs-* | STATS count() BY host.name | WHERE count > 100');
    });

    it('adds WHERE keyword when condition lacks the prefix', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: 'FROM logs-* | STATS count() BY host.name',
            condition: 'count > 100',
          },
        },
      });

      renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(mockGetESQLResults).toHaveBeenCalled();
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call.esqlQuery).toBe('FROM logs-* | STATS count() BY host.name | WHERE count > 100');
    });

    it('uses only the base query when condition is empty', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: 'FROM logs-* | STATS count() BY host.name',
            condition: '',
          },
        },
      });

      renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(mockGetESQLResults).toHaveBeenCalled();
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call.esqlQuery).toBe('FROM logs-* | STATS count() BY host.name');
    });

    it('uses only the base query when condition is undefined', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: 'FROM logs-* | STATS count() BY host.name',
          },
        },
      });

      renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(mockGetESQLResults).toHaveBeenCalled();
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call.esqlQuery).toBe('FROM logs-* | STATS count() BY host.name');
    });

    it('handles condition with lowercase where prefix', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: 'FROM logs-*',
            condition: 'where status >= 500',
          },
        },
      });

      renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(mockGetESQLResults).toHaveBeenCalled();
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call.esqlQuery).toBe('FROM logs-* | where status >= 500');
    });

    it('does not execute when base query is empty even if condition exists', async () => {
      const wrapper = createFormWrapper({
        ...defaultFormValues,
        evaluation: {
          query: {
            base: '',
            condition: 'WHERE count > 100',
          },
        },
      });

      const { result } = renderHook(() => useRulePreview(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockGetESQLResults).not.toHaveBeenCalled();
    });
  });

  describe('grouping fields and unique group count', () => {
    const groupingResponse = {
      response: {
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [
          ['host-1', '10'],
          ['host-2', '20'],
          ['host-1', '30'],
          ['host-3', '5'],
        ],
      },
    };

    it('returns groupingFields from form state', async () => {
      mockGetESQLResults.mockResolvedValue(groupingResponse as any);

      const wrapper = createFormWrapper({
        ...defaultFormValues,
        grouping: { fields: ['host.name'] },
      });

      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupingFields).toEqual(['host.name']);
    });

    it('returns empty groupingFields when no grouping is configured', async () => {
      const wrapper = createFormWrapper(defaultFormValues);
      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupingFields).toEqual([]);
    });

    it('computes uniqueGroupCount from distinct grouping field values', async () => {
      mockGetESQLResults.mockResolvedValue(groupingResponse as any);

      const wrapper = createFormWrapper({
        ...defaultFormValues,
        grouping: { fields: ['host.name'] },
      });

      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // host-1 appears twice, host-2 and host-3 once each → 3 unique groups
      expect(result.current.uniqueGroupCount).toBe(3);
    });

    it('returns null uniqueGroupCount when no grouping is configured', async () => {
      mockGetESQLResults.mockResolvedValue(groupingResponse as any);

      const wrapper = createFormWrapper(defaultFormValues);
      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.uniqueGroupCount).toBeNull();
    });

    it('returns null uniqueGroupCount when there are no rows', async () => {
      mockGetESQLResults.mockResolvedValue({
        response: {
          columns: [{ name: 'host.name', type: 'keyword' }],
          values: [],
        },
      } as any);

      const wrapper = createFormWrapper({
        ...defaultFormValues,
        grouping: { fields: ['host.name'] },
      });

      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.uniqueGroupCount).toBeNull();
    });

    it('computes uniqueGroupCount with multiple grouping fields', async () => {
      mockGetESQLResults.mockResolvedValue({
        response: {
          columns: [
            { name: 'host.name', type: 'keyword' },
            { name: 'service.name', type: 'keyword' },
            { name: 'count', type: 'long' },
          ],
          values: [
            ['host-1', 'svc-a', '10'],
            ['host-1', 'svc-b', '20'],
            ['host-1', 'svc-a', '30'], // duplicate of first
            ['host-2', 'svc-a', '5'],
          ],
        },
      } as any);

      const wrapper = createFormWrapper({
        ...defaultFormValues,
        grouping: { fields: ['host.name', 'service.name'] },
      });

      const { result } = renderHook(() => useRulePreview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // (host-1,svc-a), (host-1,svc-b), (host-2,svc-a) → 3 unique groups
      expect(result.current.uniqueGroupCount).toBe(3);
    });
  });
});
