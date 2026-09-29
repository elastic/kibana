/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDeleteIntegration } from './use_delete_integration';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

vi.mock('../lib/api');
const mockDeleteIntegration = api.deleteIntegration as Mock;

const mockToastsAddSuccess = vi.fn();
const mockToastsAddError = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('./use_kibana', () => {
      const mocked = {
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
    };
      return { ...mocked, default: mocked };
    });

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

  queryClient.invalidateQueries = mockInvalidateQueries;

  function QueryClientTestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return QueryClientTestWrapper;
};

describe('useDeleteIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation object and initial state', () => {
    const { result } = renderHook(() => useDeleteIntegration(), {
      wrapper: createWrapper(),
    });

    expect(result.current.deleteIntegrationMutation).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call deleteIntegration API with integration id', async () => {
    mockDeleteIntegration.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteIntegration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deleteIntegrationMutation.mutateAsync({
        integrationId: 'integration-abc',
      });
    });

    expect(mockDeleteIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: 'integration-abc',
      })
    );
  });

  it('should show success toast and invalidate integration and list queries on success', async () => {
    mockDeleteIntegration.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteIntegration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deleteIntegrationMutation.mutateAsync({
        integrationId: 'integration-xyz',
      });
    });

    expect(mockToastsAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
      })
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['integration', 'integration-xyz'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['all-integrations'],
    });
  });

  it('should show error toast on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Server error');
    mockDeleteIntegration.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteIntegration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.deleteIntegrationMutation.mutateAsync({
          integrationId: 'i1',
        });
      } catch {
        // Expected
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
});
