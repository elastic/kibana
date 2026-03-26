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

import { useDeleteCloudConnector } from './use_delete_cloud_connector';

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttp = {
  delete: jest.fn(),
};

const mockToasts = {
  addSuccess: jest.fn(),
  addError: jest.fn(),
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useDeleteCloudConnector', () => {
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

    mockHttp.delete.mockClear();
    mockToasts.addSuccess.mockClear();
    mockToasts.addError.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should call delete API with correct path and query', async () => {
    mockHttp.delete.mockResolvedValue({ id: 'connector-123' });

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.delete).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.DELETE_PATTERN.replace('{cloudConnectorId}', 'connector-123'),
      { query: { force: false } }
    );
  });

  it('should call delete API with force=true when specified', async () => {
    mockHttp.delete.mockResolvedValue({ id: 'connector-123' });

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({ force: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.delete).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_API_ROUTES.DELETE_PATTERN.replace('{cloudConnectorId}', 'connector-123'),
      { query: { force: true } }
    );
  });

  it('should show success toast on successful deletion', async () => {
    mockHttp.delete.mockResolvedValue({ id: 'connector-123' });

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockToasts.addSuccess).toHaveBeenCalledWith({
      title: 'Cloud connector deleted successfully',
    });
  });

  it('should call onSuccess callback on successful deletion', async () => {
    mockHttp.delete.mockResolvedValue({ id: 'connector-123' });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123', onSuccess), {
      wrapper,
    });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith({ id: 'connector-123' });
  });

  it('should surface server error message in toast when API returns an error with body.message', async () => {
    const serverErrorMessage =
      'Error deleting cloud connector in Fleet, Cannot delete cloud connector "test" as it is being used by 1 package policies';
    const httpError = Object.assign(new Error('Bad Request'), {
      body: { message: serverErrorMessage, statusCode: 400, error: 'Bad Request' },
      request: {},
      response: {},
    });

    mockHttp.delete.mockRejectedValue(httpError);

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg, optionsArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe(serverErrorMessage);
    expect(optionsArg.title).toBe('Failed to delete cloud connector');
  });

  it('should fallback to original error when body.message is not available', async () => {
    const genericError = new Error('Network error');
    mockHttp.delete.mockRejectedValue(genericError);

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg, optionsArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe('Network error');
    expect(optionsArg.title).toBe('Failed to delete cloud connector');
  });

  it('should call onError callback on failure', async () => {
    const httpError = Object.assign(new Error('Bad Request'), {
      body: { message: 'Some server error', statusCode: 400 },
      request: {},
      response: {},
    });
    mockHttp.delete.mockRejectedValue(httpError);
    const onError = jest.fn();

    const { result } = renderHook(
      () => useDeleteCloudConnector('connector-123', undefined, onError),
      { wrapper }
    );

    act(() => {
      result.current.mutate({});
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

    const { result } = renderHook(() => useDeleteCloudConnector('connector-123'), { wrapper });

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
    const [errorArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg.message).toBe('HTTP service is not available');
  });
});
