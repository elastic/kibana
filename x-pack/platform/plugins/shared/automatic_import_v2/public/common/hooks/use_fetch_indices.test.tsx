/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchIndices } from './use_fetch_indices';
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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

  it('should return indices list on success', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [{ name: 'index-1' }, { name: 'index-2' }, { name: 'index-3' }],
      aliases: [],
      data_streams: [],
    });

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.indices).toEqual(['index-1', 'index-2', 'index-3']);
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

  it('should use default search pattern "*" when no search provided', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });

    renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(mockHttpGet).toHaveBeenCalledWith('/internal/index-pattern-management/resolve_index/*');
  });

  it('should add wildcard to search pattern if not present', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });

    renderHook(() => useFetchIndices('logs'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(mockHttpGet).toHaveBeenCalledWith(
      '/internal/index-pattern-management/resolve_index/logs*'
    );
  });

  it('should not add extra wildcard if search already ends with wildcard', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });

    renderHook(() => useFetchIndices('logs*'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(mockHttpGet).toHaveBeenCalledWith(
      '/internal/index-pattern-management/resolve_index/logs*'
    );
  });

  it('should URL encode the search pattern', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });

    renderHook(() => useFetchIndices('logs with spaces'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(mockHttpGet).toHaveBeenCalledWith(
      '/internal/index-pattern-management/resolve_index/logs%20with%20spaces*'
    );
  });

  it('should provide refetch function', async () => {
    mockHttpGet.mockResolvedValue({
      indices: [{ name: 'index-1' }],
      aliases: [],
      data_streams: [],
    });

    const { result } = renderHook(() => useFetchIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
