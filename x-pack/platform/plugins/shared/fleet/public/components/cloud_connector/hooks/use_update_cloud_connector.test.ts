/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

import { useUpdateCloudConnector } from './use_update_cloud_connector';

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttp = {
  put: jest.fn(),
};

const mockToasts = {
  addSuccess: jest.fn(),
  addError: jest.fn(),
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockCloudConnector = {
  id: 'connector-123',
  name: 'Test Connector',
  cloudProvider: 'aws',
  vars: { role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' } },
  packagePolicyCount: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

describe('useUpdateCloudConnector', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: {
          toasts: mockToasts,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockHttp.put.mockClear();
    mockToasts.addSuccess.mockClear();
    mockToasts.addError.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should call update API with correct path and body', async () => {
    mockHttp.put.mockResolvedValue({ item: { ...mockCloudConnector, name: 'Updated Name' } });

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.put).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.UPDATE_PATTERN.replace('{cloudConnectorId}', 'connector-123'),
      { body: JSON.stringify({ name: 'Updated Name' }) }
    );
  });

  it('should show success toast on successful update', async () => {
    mockHttp.put.mockResolvedValue({ item: { ...mockCloudConnector, name: 'Updated Name' } });

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockToasts.addSuccess).toHaveBeenCalledWith({
      title: 'Cloud connector updated successfully',
    });
  });

  it('should call onSuccess callback on successful update', async () => {
    const updatedConnector = { ...mockCloudConnector, name: 'Updated Name' };
    mockHttp.put.mockResolvedValue({ item: updatedConnector });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123', onSuccess), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(updatedConnector);
  });

  it('should surface server error message in toast when API returns an error with body.message', async () => {
    const serverErrorMessage =
      'Error creating cloud connector in Fleet, A cloud connector with this name already exists';
    const httpError = Object.assign(new Error('Bad Request'), {
      body: { message: serverErrorMessage, statusCode: 400, error: 'Bad Request' },
      request: {},
      response: {},
    });

    mockHttp.put.mockRejectedValue(httpError);

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Duplicate Name' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg, optionsArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe(serverErrorMessage);
    expect(optionsArg.title).toBe('Failed to update cloud connector');
  });

  it('should fallback to original error when body.message is not available', async () => {
    const genericError = new Error('Network error');
    mockHttp.put.mockRejectedValue(genericError);

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg, optionsArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe('Network error');
    expect(optionsArg.title).toBe('Failed to update cloud connector');
  });

  it('should call onError callback on failure', async () => {
    const httpError = Object.assign(new Error('Bad Request'), {
      body: { message: 'Some server error', statusCode: 400 },
      request: {},
      response: {},
    });
    mockHttp.put.mockRejectedValue(httpError);
    const onError = jest.fn();

    const { result } = renderHook(
      () => useUpdateCloudConnector('connector-123', undefined, onError),
      { wrapper }
    );

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(httpError);
  });

  it('should throw error when http service is not available', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: undefined,
        notifications: {
          toasts: mockToasts,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useUpdateCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe('HTTP service is not available');
  });
});
