/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDataStreamStats } from './use_data_stream_stats';
import type { Streams } from '@kbn/streams-schema';

// Mock the Kibana hook
const mockDataStreamsClient = Promise.resolve({
  getDataStreamsStats: jest.fn(),
});

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      dataStreamsClient: mockDataStreamsClient,
    },
  }),
}));

// Mock the fetch hook
jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: jest.fn(),
}));

describe('useDataStreamStats', () => {
  const { useStreamsAppFetch } = require('../../../../hooks/use_streams_app_fetch');

  const createMockDefinition = (streamName = 'test-stream'): Streams.ingest.all.GetResponse => ({
    stream: { name: streamName },
  } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('initializes with correct parameters', () => {
      const definition = createMockDefinition('test-stream');
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      });

      renderHook(() => useDataStreamStats({ definition }));

      expect(useStreamsAppFetch).toHaveBeenCalledWith(
        expect.any(Function),
        [mockDataStreamsClient, definition],
        {
          withTimeRange: false,
          withRefresh: true,
        }
      );
    });

    it('passes different definitions correctly', () => {
      const testCases = ['logs.app', 'metrics.system', 'traces.apm'];

      testCases.forEach((streamName) => {
        const definition = createMockDefinition(streamName);
        
        useStreamsAppFetch.mockReturnValue({
          value: undefined,
          loading: false,
          error: undefined,
          refresh: jest.fn(),
        });

        renderHook(() => useDataStreamStats({ definition }));

        expect(useStreamsAppFetch).toHaveBeenCalledWith(
          expect.any(Function),
          [mockDataStreamsClient, definition],
          {
            withTimeRange: false,
            withRefresh: true,
          }
        );
      });
    });
  });

  describe('Loading State', () => {
    it('returns loading state when data is being fetched', () => {
      const definition = createMockDefinition();
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
        error: undefined,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('returns non-loading state when data fetch is complete', () => {
      const definition = createMockDefinition();
      const mockStats = {
        sizeBytes: 1024 * 1024,
        totalDocs: 1000,
        bytesPerDay: 1024 * 512,
      };
      
      useStreamsAppFetch.mockReturnValue({
        value: mockStats,
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('returns error state when fetch fails', () => {
      const definition = createMockDefinition();
      const mockError = new Error('Failed to fetch stats');
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: mockError,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats).toBeUndefined();
      expect(result.current.error).toBe(mockError);
    });

    it('handles network errors gracefully', () => {
      const definition = createMockDefinition();
      const networkError = new Error('Network error');
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: networkError,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.error).toBe(networkError);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Successful Data Fetching', () => {
    it('returns stats data when fetch is successful', () => {
      const definition = createMockDefinition();
      const mockStats = {
        sizeBytes: 1024 * 1024 * 100, // 100 MB
        totalDocs: 50000,
        bytesPerDay: 1024 * 1024 * 5, // 5 MB per day
      };
      
      useStreamsAppFetch.mockReturnValue({
        value: mockStats,
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockStats);
      expect(result.current.error).toBeUndefined();
    });

    it('handles partial stats data', () => {
      const definition = createMockDefinition();
      const partialStats = {
        sizeBytes: 1024 * 1024,
        totalDocs: undefined, // Missing totalDocs
        bytesPerDay: 1024,
      };
      
      useStreamsAppFetch.mockReturnValue({
        value: partialStats,
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.data).toEqual(partialStats);
      expect(result.current.data?.totalDocs).toBeUndefined();
      expect(result.current.data?.sizeBytes).toBe(1024 * 1024);
    });

    it('handles stats with zero values', () => {
      const definition = createMockDefinition();
      const zeroStats = {
        sizeBytes: 0,
        totalDocs: 0,
        bytesPerDay: 0,
      };
      
      useStreamsAppFetch.mockReturnValue({
        value: zeroStats,
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.data).toEqual(zeroStats);
      expect(result.current.data?.sizeBytes).toBe(0);
      expect(result.current.data?.totalDocs).toBe(0);
      expect(result.current.data?.bytesPerDay).toBe(0);
    });
  });

  describe('Fetch Function Configuration', () => {
    it('configures fetch function with correct API endpoint', () => {
      const definition = createMockDefinition('logs.application');
      
      useStreamsAppFetch.mockImplementation((fetchFn) => {
        // Call the fetch function to verify it's configured correctly
        const mockSignal = new AbortController().signal;
        fetchFn({ signal: mockSignal });
        
        return {
          value: undefined,
          loading: false,
          error: undefined,
        };
      });

      renderHook(() => useDataStreamStats({ definition }));

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
        'GET /internal/streams/{name}/_stats',
        {
          params: { path: { name: 'logs.application' } },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('passes abort signal correctly', () => {
      const definition = createMockDefinition();
      
      useStreamsAppFetch.mockImplementation((fetchFn) => {
        const mockSignal = new AbortController().signal;
        fetchFn({ signal: mockSignal });
        
        return {
          value: undefined,
          loading: false,
          error: undefined,
        };
      });

      renderHook(() => useDataStreamStats({ definition }));

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('Dependencies Array', () => {
    it('updates when definition changes', () => {
      const definition1 = createMockDefinition('stream-1');
      const definition2 = createMockDefinition('stream-2');
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: undefined,
      });

      const { rerender } = renderHook(
        ({ definition }) => useDataStreamStats({ definition }),
        { initialProps: { definition: definition1 } }
      );

      expect(useStreamsAppFetch).toHaveBeenLastCalledWith(
        expect.any(Function),
        [mockStreamsRepositoryClient, definition1]
      );

      // Change the definition
      rerender({ definition: definition2 });

      expect(useStreamsAppFetch).toHaveBeenLastCalledWith(
        expect.any(Function),
        [mockStreamsRepositoryClient, definition2]
      );
    });

    it('includes streamsRepositoryClient in dependencies', () => {
      const definition = createMockDefinition();
      
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: undefined,
      });

      renderHook(() => useDataStreamStats({ definition }));

      const [, dependencies] = useStreamsAppFetch.mock.calls[0];
      expect(dependencies).toContain(mockStreamsRepositoryClient);
      expect(dependencies).toContain(definition);
    });
  });

  describe('Return Value Structure', () => {
    it('returns object with expected properties', () => {
      const definition = createMockDefinition();
      const mockStats = {
        sizeBytes: 1024,
        totalDocs: 100,
        bytesPerDay: 512,
      };
      
      useStreamsAppFetch.mockReturnValue({
        value: mockStats,
        loading: false,
        error: undefined,
      });

      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('maintains consistent return value structure across states', () => {
      const definition = createMockDefinition();
      
      // Loading state
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
        error: undefined,
      });

      const { result, rerender } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Success state
      useStreamsAppFetch.mockReturnValue({
        value: { sizeBytes: 1024 },
        loading: false,
        error: undefined,
      });

      rerender();

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Error state
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: new Error('Test error'),
      });

      rerender();

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });
  });
});