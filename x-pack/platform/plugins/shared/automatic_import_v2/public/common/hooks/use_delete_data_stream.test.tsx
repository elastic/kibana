/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDeleteDataStream } from './use_delete_data_stream';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockDeleteDataStream = api.deleteDataStream as jest.Mock;

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

describe('useDeleteDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return mutation object and initial state', () => {
      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.deleteDataStreamMutation).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful mutation', () => {
    it('should call API with correct request body', async () => {
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      const request = {
        integrationId: 'integration-123',
        dataStreamId: 'data-stream-456',
      };

      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync(request);
      });

      expect(mockDeleteDataStream).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
        })
      );
    });

    it('should show success toast on success', async () => {
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync({
          integrationId: 'i1',
          dataStreamId: 'd1',
        });
      });

      expect(mockToastsAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
        })
      );
    });

    it('should invalidate integration query on success', async () => {
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync({
          integrationId: 'integration-123',
          dataStreamId: 'd1',
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
      mockDeleteDataStream.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.deleteDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
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
      mockDeleteDataStream.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.deleteDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
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

      mockDeleteDataStream.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.deleteDataStreamMutation.mutateAsync({
            integrationId: 'i1',
            dataStreamId: 'd1',
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
      mockDeleteDataStream.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.deleteDataStreamMutation.mutate({
          integrationId: 'i1',
          dataStreamId: 'd1',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise!(undefined);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
