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
import type { IntegrationResponse } from '../../../common';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockDeleteDataStream = api.deleteDataStream as jest.Mock;

const mockToastsAddSuccess = jest.fn();
const mockToastsAddError = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockCancelQueries = jest.fn();
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();

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

const mockIntegrationData: IntegrationResponse = {
  integrationId: 'integration-123',
  title: 'Test Integration',
  description: 'A test integration',
  status: 'completed',
  dataStreams: [
    {
      dataStreamId: 'data-stream-456',
      title: 'Test Data Stream',
      description: 'A test data stream',
      inputTypes: [{ name: 'filestream' }],
      status: 'completed',
    },
    {
      dataStreamId: 'data-stream-789',
      title: 'Another Data Stream',
      description: 'Another test data stream',
      inputTypes: [{ name: 'tcp' }],
      status: 'completed',
    },
  ],
};

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

  // Mock query client methods
  queryClient.invalidateQueries = mockInvalidateQueries;
  queryClient.cancelQueries = mockCancelQueries;
  queryClient.setQueryData = mockSetQueryData;
  queryClient.getQueryData = mockGetQueryData;

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

    it('should still invalidate queries on failure via onSettled', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockDeleteDataStream.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.deleteDataStreamMutation.mutateAsync({
            integrationId: 'integration-123',
            dataStreamId: 'd1',
          });
        } catch {
          // Expected to throw
        }
      });

      // onSettled is called on both success and error to refetch server state
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['integration', 'integration-123'],
      });

      consoleSpy.mockRestore();
    });

    it('should rollback optimistic update on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockGetQueryData.mockReturnValue(mockIntegrationData);
      mockDeleteDataStream.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.deleteDataStreamMutation.mutateAsync({
            integrationId: 'integration-123',
            dataStreamId: 'data-stream-456',
          });
        } catch {
          // Expected to throw
        }
      });

      // Should rollback to the original data
      expect(mockSetQueryData).toHaveBeenLastCalledWith(
        ['integration', 'integration-123'],
        mockIntegrationData
      );

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

  describe('optimistic updates', () => {
    it('should cancel queries and set optimistic status to deleting on mutate', async () => {
      mockGetQueryData.mockReturnValue(mockIntegrationData);
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
        });
      });

      // Should cancel queries before optimistic update
      expect(mockCancelQueries).toHaveBeenCalledWith({
        queryKey: ['integration', 'integration-123'],
      });

      // Should set optimistic data with status changed to 'deleting'
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['integration', 'integration-123'],
        expect.objectContaining({
          dataStreams: expect.arrayContaining([
            expect.objectContaining({
              dataStreamId: 'data-stream-456',
              status: 'deleting',
            }),
          ]),
        })
      );
    });

    it('should not modify other data streams when setting optimistic status', async () => {
      mockGetQueryData.mockReturnValue(mockIntegrationData);
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
        });
      });

      // The other data stream should remain unchanged
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['integration', 'integration-123'],
        expect.objectContaining({
          dataStreams: expect.arrayContaining([
            expect.objectContaining({
              dataStreamId: 'data-stream-789',
              status: 'completed', // Should remain unchanged
            }),
          ]),
        })
      );
    });

    it('should handle missing integration data gracefully', async () => {
      mockGetQueryData.mockReturnValue(undefined);
      mockDeleteDataStream.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteDataStream(), {
        wrapper: createWrapper(),
      });

      // Should not throw when integration data is not in cache
      await act(async () => {
        await result.current.deleteDataStreamMutation.mutateAsync({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
        });
      });

      // Should still call cancelQueries
      expect(mockCancelQueries).toHaveBeenCalled();

      // setQueryData should not be called for optimistic update when no previous data
      // But it may be called once (or not at all) depending on context rollback
      expect(mockDeleteDataStream).toHaveBeenCalled();
    });
  });
});
