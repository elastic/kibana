/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { buildSelectableIndexAndDataStreamNames, useFetchIndices } from './use_fetch_indices';
import { useKibana } from './use_kibana';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

jest.mock('./use_kibana');
const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  function QueryClientTestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return QueryClientTestWrapper;
};

describe('buildSelectableIndexAndDataStreamNames', () => {
  it('excludes hidden indices', () => {
    expect(
      buildSelectableIndexAndDataStreamNames([
        { name: 'visible', hidden: false },
        { name: '.hidden-idx', hidden: true },
      ])
    ).toEqual(['visible']);
  });

  it('dedupes data stream names from multiple backing indices', () => {
    expect(
      buildSelectableIndexAndDataStreamNames([
        { name: '.ds-logs-foo-2024-01-01-000001', data_stream: 'logs-foo' },
        { name: '.ds-logs-foo-2024-02-01-000001', data_stream: 'logs-foo' },
      ])
    ).toEqual(['logs-foo']);
  });

  it('includes data streams when backing indices are hidden (e.g. LogsDB / standard .ds-* )', () => {
    expect(
      buildSelectableIndexAndDataStreamNames([
        {
          name: '.ds-logs-nginx.access-2025.01.01-000001',
          hidden: true,
          data_stream: 'logs-nginx.access-default',
        },
        {
          name: '.ds-metrics-system-000001',
          hidden: true,
          data_stream: 'metrics-system-default',
        },
      ])
    ).toEqual(['logs-nginx.access-default', 'metrics-system-default']);
  });

  it('includes standalone index names and data streams, sorted', () => {
    expect(
      buildSelectableIndexAndDataStreamNames([
        { name: 'my-index' },
        { name: '.ds-bar-000001', data_stream: 'logs-bar' },
        { name: 'zzz-index' },
      ])
    ).toEqual(['logs-bar', 'my-index', 'zzz-index']);
  });
});

describe('useFetchIndices', () => {
  const mockHttpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          get: mockHttpGet,
        },
      },
    });
  });

  it('should return empty array initially while loading', () => {
    mockHttpGet.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    expect(result.current.indices).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('should return standalone index names on success', async () => {
    mockHttpGet.mockResolvedValue([{ name: 'index-1' }, { name: 'index-2' }, { name: 'index-3' }]);

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.indices).toEqual(['index-1', 'index-2', 'index-3']);
    expect(result.current.isError).toBe(false);
  });

  it('should return data stream names from backing indices', async () => {
    mockHttpGet.mockResolvedValue([
      { name: '.ds-logs-foo-000001', data_stream: 'logs-foo' },
      { name: '.ds-logs-bar-000001', data_stream: 'logs-bar' },
    ]);

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.indices).toEqual(['logs-bar', 'logs-foo']);
    expect(result.current.isError).toBe(false);
  });

  it('should handle API errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockHttpGet.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.indices).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('should call Index Management indices API with version 1', async () => {
    mockHttpGet.mockResolvedValue([]);

    renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(mockHttpGet).toHaveBeenCalledWith('/api/index_management/indices', {
      version: '1',
      signal: expect.any(AbortSignal),
    });
  });

  it('should provide refetch function', async () => {
    mockHttpGet.mockResolvedValue([{ name: 'index-1' }]);

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
