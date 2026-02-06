/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetIntegrationById } from './use_get_integration_by_id';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockGetIntegrationById = api.getIntegrationById as jest.Mock;

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
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
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGetIntegrationById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined integration when integrationId is undefined', async () => {
    const { result } = renderHook(() => useGetIntegrationById(undefined), {
      wrapper: createWrapper(),
    });

    // Query should be disabled when integrationId is undefined - API should not be called
    // Allow time for any potential calls
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current.integration).toBeUndefined();
    expect(mockGetIntegrationById).not.toHaveBeenCalled();
  });

  it('should return undefined integration when integrationId is empty string', async () => {
    const { result } = renderHook(() => useGetIntegrationById(''), {
      wrapper: createWrapper(),
    });

    // Query should be disabled when integrationId is empty - API should not be called
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current.integration).toBeUndefined();
    expect(mockGetIntegrationById).not.toHaveBeenCalled();
  });

  it('should return integration data on success', async () => {
    const mockIntegration = {
      integrationId: 'test-id',
      title: 'Test Integration',
      description: 'A test integration',
      dataStreams: [],
    };

    mockGetIntegrationById.mockResolvedValue({
      integrationResponse: mockIntegration,
    });

    const { result } = renderHook(() => useGetIntegrationById('test-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.integration).toEqual(mockIntegration);
    expect(result.current.isError).toBe(false);
    expect(mockGetIntegrationById).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: 'test-id',
      })
    );
  });

  it('should handle API errors', async () => {
    // Suppress unrelated React Query errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockGetIntegrationById.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useGetIntegrationById('missing-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.integration).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('should provide refetch function', async () => {
    mockGetIntegrationById.mockResolvedValue({
      integrationResponse: { integrationId: 'test-id' },
    });

    const { result } = renderHook(() => useGetIntegrationById('test-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should set isLoading to true while fetching', () => {
    mockGetIntegrationById.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useGetIntegrationById('loading-id'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
