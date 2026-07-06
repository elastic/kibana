/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRegionPolicy, useSaveRegionPolicy } from './use_region_policy';
import { useKibana } from './use_kibana';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useRegionPolicy', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { http: { get: mockGet } } });
  });

  it('calls the correct endpoint with version', async () => {
    const responseData = { region_policy: { allowed_regions: [] }, created_at: '2026-01-01' };
    mockGet.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('returns data from the API', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockGet.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(responseData);
  });

  it('returns null when the API responds with 404 (no policy configured)', async () => {
    mockGet.mockRejectedValue({ body: { statusCode: 404 } });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('also treats response.status 404 as null', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('propagates non-404 errors', async () => {
    mockGet.mockRejectedValue(new Error('server error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('uses the correct query key', async () => {
    mockGet.mockResolvedValue({});

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useRegionPolicy(), { wrapper: Wrapper });

    await waitFor(() => expect(queryClient.getQueryState([REGION_POLICY_QUERY_KEY])).toBeDefined());
  });
});

describe('useSaveRegionPolicy', () => {
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

  it('calls PUT with the correct path, body, and version', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockPut.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    const body = { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] };

    act(() => {
      result.current.mutate(body);
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockPut).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      body: JSON.stringify(body),
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('shows success toast and invalidates query cache on success', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockPut.mockResolvedValue(responseData);

    const { queryClient } = createWrapper();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSaveRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate({ allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] });
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Region preferences saved' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [REGION_POLICY_QUERY_KEY] })
    );
  });

  it('shows error toast on error', async () => {
    const serverError = new Error('server error');
    mockPut.mockRejectedValue(serverError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ allowed_regions: [] });
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    expect(mockAddError).toHaveBeenCalledWith(
      serverError,
      expect.objectContaining({ title: 'Failed to save region preferences' })
    );
  });
});
