/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

import { useCloudConnectorUsage } from './use_cloud_connector_usage';

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttp = {
  get: jest.fn(),
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useCloudConnectorUsage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockHttp.get.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should fetch cloud connector usage', async () => {
    const mockUsageData = {
      items: [
        {
          id: 'policy-1',
          name: 'Test Policy 1',
          package: {
            name: 'cloud_security_posture',
            title: 'Cloud Security Posture',
            version: '1.0.0',
          },
          policy_ids: ['agent-policy-1'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ],
    };

    mockHttp.get.mockResolvedValue(mockUsageData);

    const { result } = renderHook(() => useCloudConnectorUsage('connector-id-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.get).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.USAGE_PATTERN.replace('{cloudConnectorId}', 'connector-id-123'),
      { query: { page: 1, perPage: 10 } }
    );
    expect(result.current.data).toEqual(mockUsageData);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch usage');
    mockHttp.get.mockRejectedValue(mockError);

    const { result } = renderHook(() => useCloudConnectorUsage('connector-id-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should not fetch when cloudConnectorId is empty', () => {
    const { result } = renderHook(() => useCloudConnectorUsage(''), { wrapper });

    expect(mockHttp.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('should throw error when http service is not available', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: undefined,
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useCloudConnectorUsage('connector-id-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('HTTP service is not available'));
  });

  it('should accept custom staleTime option', async () => {
    const mockUsageData = {
      items: [],
      total: 0,
      page: 1,
      perPage: 10,
    };

    mockHttp.get.mockResolvedValue(mockUsageData);

    const { result } = renderHook(
      () => useCloudConnectorUsage('connector-id-123', 1, 10, { staleTime: 0 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.get).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.USAGE_PATTERN.replace('{cloudConnectorId}', 'connector-id-123'),
      { query: { page: 1, perPage: 10 } }
    );
    expect(result.current.data).toEqual(mockUsageData);
  });

  it('should use custom pagination parameters', async () => {
    const mockUsageData = {
      items: [],
      total: 25,
      page: 2,
      perPage: 5,
    };

    mockHttp.get.mockResolvedValue(mockUsageData);

    const { result } = renderHook(() => useCloudConnectorUsage('connector-id-123', 2, 5), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.get).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.USAGE_PATTERN.replace('{cloudConnectorId}', 'connector-id-123'),
      { query: { page: 2, perPage: 5 } }
    );
  });
});
