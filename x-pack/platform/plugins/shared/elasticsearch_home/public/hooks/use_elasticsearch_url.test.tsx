/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { homeContextWrapper } from '../test_utils';
import { useElasticsearchUrl } from './use_elasticsearch_url';

const ES_URL = 'https://my-project.es.example.com';

const createWrapper = (cloud?: CloudStart) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const HomeWrapper = homeContextWrapper({ services: { cloud } });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <HomeWrapper>{children}</HomeWrapper>
    </QueryClientProvider>
  );
};

describe('useElasticsearchUrl', () => {
  it('returns the endpoint cloud reports', async () => {
    const cloud = cloudMock.createStart();
    cloud.fetchElasticsearchConfig.mockResolvedValue({ elasticsearchUrl: ES_URL });

    const { result } = renderHook(() => useElasticsearchUrl(), {
      wrapper: createWrapper(cloud),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.url).toBe(ES_URL);
  });

  it('returns null when cloud is unavailable', async () => {
    const { result } = renderHook(() => useElasticsearchUrl(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.url).toBeNull();
  });

  it('returns null rather than failing when the config request rejects', async () => {
    const cloud = cloudMock.createStart();
    cloud.fetchElasticsearchConfig.mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useElasticsearchUrl(), {
      wrapper: createWrapper(cloud),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.url).toBeNull();
  });
});
