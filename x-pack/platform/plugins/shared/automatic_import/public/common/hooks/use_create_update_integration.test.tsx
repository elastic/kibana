/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCreateUpdateIntegration } from './use_create_update_integration';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockCreateIntegration = api.createIntegration as jest.Mock;

const mockToastsAddSuccess = jest.fn();
const mockToastsAddError = jest.fn();

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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreateUpdateIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return mutation object and initial state', () => {
      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.createUpdateIntegrationMutation).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful mutation', () => {
    it('should call API with correct request body', async () => {
      mockCreateIntegration.mockResolvedValue({
        integration_id: 'new-integration-id',
      });

      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      const request = {
        connectorId: 'connector-123',
        integrationId: 'integration-456',
        title: 'Test Integration',
        description: 'Test description',
      };

      await act(async () => {
        await result.current.createUpdateIntegrationMutation.mutateAsync(request);
      });

      expect(mockCreateIntegration).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-123',
          integrationId: 'integration-456',
          title: 'Test Integration',
          description: 'Test description',
        })
      );
    });

    it('should show success toast on success', async () => {
      mockCreateIntegration.mockResolvedValue({
        integration_id: 'new-integration-id',
      });

      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createUpdateIntegrationMutation.mutateAsync({
          connectorId: 'c1',
          integrationId: 'i1',
          title: 'Test',
          description: 'Test',
        });
      });

      expect(mockToastsAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
        })
      );
    });
  });

  describe('failed mutation', () => {
    it('should show error toast on failure', async () => {
      // Suppress expected console.error from React Query's onError callback
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Server error');
      mockCreateIntegration.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.createUpdateIntegrationMutation.mutateAsync({
            connectorId: 'c1',
            integrationId: 'i1',
            title: 'Test',
            description: 'Test',
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
      // Suppress expected console.error from React Query's onError callback
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Server error');
      mockCreateIntegration.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.createUpdateIntegrationMutation.mutateAsync({
            connectorId: 'c1',
            integrationId: 'i1',
            title: 'Test',
            description: 'Test',
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
  });

  describe('loading state', () => {
    it('should set isLoading to true during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      mockCreateIntegration.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useCreateUpdateIntegration(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.createUpdateIntegrationMutation.mutate({
          connectorId: 'c1',
          integrationId: 'i1',
          title: 'Test',
          description: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise to clean up
      await act(async () => {
        resolvePromise!({ integration_id: 'test' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
