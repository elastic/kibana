/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRegionPolicy } from './use_region_policy';
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
