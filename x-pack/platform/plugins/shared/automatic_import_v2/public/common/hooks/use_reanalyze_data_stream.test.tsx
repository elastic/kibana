/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useReanalyzeDataStream } from './use_reanalyze_data_stream';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockReanalyzeDataStream = api.reanalyzeDataStream as jest.Mock;

const mockToastsAddSuccess = jest.fn();
const mockToastsAddError = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: {
        toasts: {
          addSuccess: mockToastsAddSuccess,
          addError: mockToastsAddError,
        },
      },
    },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Mock invalidateQueries on the query client
  queryClient.invalidateQueries = mockInvalidateQueries;

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useReanalyzeDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return mutation object and initial state', () => {
      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.reanalyzeDataStreamMutation).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful mutation', () => {
    it('should call API with correct request body', async () => {
      mockReanalyzeDataStream.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      const request = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
        connectorId: 'connector-789',
      };

      await act(async () => {
        await result.current.reanalyzeDataStreamMutation.mutateAsync(request);
      });

      expect(mockReanalyzeDataStream).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          connectorId: 'connector-789',
        })
      );
    });

    it('should show success toast on success', async () => {
      mockReanalyzeDataStream.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.reanalyzeDataStreamMutation.mutateAsync({
          integrationId: 'i1',
          dataStreamId: 'd1',
          connectorId: 'c1',
        });
      });

      expect(mockToastsAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
        })
      );
    });

    it('should invalidate integration query on success', async () => {
      mockReanalyzeDataStream.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.reanalyzeDataStreamMutation.mutateAsync({
          integrationId: 'integration-123',
          dataStreamId: 'd1',
          connectorId: 'c1',
        });
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['integration', 'integration-123'],
      });
    });
  });

  describe('failed mutation', () => {
    it('should show error toast on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Server error');
      mockReanalyzeDataStream.mockRejectedValue(error);

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.reanalyzeDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
            connectorId: 'c1',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(mockToastsAddError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          title: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should set error state on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Server error');
      mockReanalyzeDataStream.mockRejectedValue(error);

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.reanalyzeDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
            connectorId: 'c1',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      consoleSpy.mockRestore();
    });

    it('should not invalidate queries on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockReanalyzeDataStream.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.reanalyzeDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
            connectorId: 'c1',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('loading state', () => {
    it('should set isLoading to true during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      mockReanalyzeDataStream.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useReanalyzeDataStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.reanalyzeDataStreamMutation.mutate({
          integrationId: 'i1',
          dataStreamId: 'd1',
          connectorId: 'c1',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise!({ success: true });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
