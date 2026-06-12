/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRegisteredFeatures } from './use_registered_features';
import { useKibana } from './use_kibana';
import { APIRoutes } from '../../common/types';
import { INFERENCE_FEATURES_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useRegisteredFeatures', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { http: { get: mockGet } } });
  });

  it('calls the correct endpoint with version', async () => {
    mockGet.mockResolvedValue({ features: [] });

    const { Wrapper } = createWrapper();
    renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    expect(mockGet).toHaveBeenCalledWith(APIRoutes.GET_INFERENCE_FEATURES, {
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('returns features from API response', async () => {
    const features = [
      {
        featureId: 'search',
        featureName: 'Search',
        featureDescription: 'desc',
        taskType: 'chat_completion',
        recommendedEndpoints: ['ep-1'],
      },
    ];
    mockGet.mockResolvedValue({ features });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.features).toEqual(features);
  });

  it('returns empty array when API returns no features', async () => {
    mockGet.mockResolvedValue({ features: [] });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.features).toEqual([]);
  });

  it('returns empty array when data is undefined', async () => {
    mockGet.mockResolvedValue(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.features).toEqual([]);
  });

  it('is loading initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('uses the correct query key', async () => {
    mockGet.mockResolvedValue({ features: [] });

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useRegisteredFeatures(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryState([INFERENCE_FEATURES_QUERY_KEY])).toBeDefined()
    );
  });
});
