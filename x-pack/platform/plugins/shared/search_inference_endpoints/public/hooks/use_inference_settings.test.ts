/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useInferenceSettings, useSaveInferenceSettings } from './use_inference_settings';
import { useKibana } from './use_kibana';
import { APIRoutes } from '../../common/types';
import { INFERENCE_SETTINGS_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useInferenceSettings', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { http: { get: mockGet } } });
  });

  it('calls the correct endpoint with version', async () => {
    const responseData = { data: { features: [] } };
    mockGet.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInferenceSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith(APIRoutes.GET_INFERENCE_SETTINGS, {
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('returns data from the API', async () => {
    const responseData = { data: { features: [{ feature_id: 'f1', endpoints: [] }] } };
    mockGet.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInferenceSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(responseData);
  });

  it('uses the correct query key', async () => {
    mockGet.mockResolvedValue({});

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useInferenceSettings(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryState([INFERENCE_SETTINGS_QUERY_KEY])).toBeDefined()
    );
  });
});

describe('useSaveInferenceSettings', () => {
  const mockPut = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: { put: mockPut },
        notifications: { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } },
      },
    });
  });

  it('calls the correct endpoint with body', async () => {
    const responseData = { data: { features: [] } };
    mockPut.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveInferenceSettings(), { wrapper: Wrapper });

    const body = { features: [{ feature_id: 'f1', endpoints: [{ id: 'ep-1' }] }] };

    act(() => {
      result.current.mutate(body);
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockPut).toHaveBeenCalledWith(APIRoutes.PUT_INFERENCE_SETTINGS, {
      body: JSON.stringify(body),
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('shows success toast and invalidates query cache on success', async () => {
    const responseData = { data: { features: [] } };
    mockPut.mockResolvedValue(responseData);

    const { queryClient } = createWrapper();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSaveInferenceSettings(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate({ features: [] });
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Changes saved' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [INFERENCE_SETTINGS_QUERY_KEY] })
    );
  });

  it('shows error toast on failure', async () => {
    const serverError = new Error('server error');
    mockPut.mockRejectedValue(serverError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveInferenceSettings(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ features: [] });
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    expect(mockAddError).toHaveBeenCalledWith(
      serverError,
      expect.objectContaining({ title: 'Failed to save settings' })
    );
  });
});
