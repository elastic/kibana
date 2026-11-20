/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import { useLoadConnectors } from './use_load_connectors';

const connector = {
  connectorId: 'connector-1',
  name: 'Connector 1',
  type: '.gen-ai',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

describe('useLoadConnectors', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns the connectors and whether the feature has a saved entry', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ connectors: [connector], soEntryFound: true }),
    } as unknown as HttpSetup;

    const { result } = renderHook(() => useLoadConnectors({ http, featureId: 'feature' }), {
      wrapper,
    });

    expect(result.current.soEntryFound).toBe(false);
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].id).toBe('connector-1');
    expect(result.current.soEntryFound).toBe(true);
  });

  it('reads soEntryFound from the cache when mounted while the list is already cached', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ connectors: [connector], soEntryFound: true }),
    } as unknown as HttpSetup;
    const first = renderHook(() => useLoadConnectors({ http, featureId: 'feature' }), {
      wrapper,
    });
    await waitFor(() => expect(first.result.current.soEntryFound).toBe(true));
    first.unmount();

    // The refetch of the new instance never resolves, so its own fetch cannot set the flag.
    const pendingHttp = { get: jest.fn(() => new Promise(() => {})) } as unknown as HttpSetup;
    const { result } = renderHook(
      () => useLoadConnectors({ http: pendingHttp, featureId: 'feature' }),
      {
        wrapper,
      }
    );

    expect(result.current.data).toHaveLength(1);
    expect(result.current.soEntryFound).toBe(true);
  });

  it('shares the flag between instances mounted together', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ connectors: [connector], soEntryFound: true }),
    } as unknown as HttpSetup;

    const { result } = renderHook(
      () => ({
        first: useLoadConnectors({ http, featureId: 'feature' }),
        second: useLoadConnectors({ http, featureId: 'feature' }),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.first.soEntryFound).toBe(true));
    expect(result.current.second.soEntryFound).toBe(true);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('returns the connectors array from refetch, like data', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ connectors: [connector], soEntryFound: true }),
    } as unknown as HttpSetup;
    const { result } = renderHook(() => useLoadConnectors({ http, featureId: 'feature' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    const refetched = await result.current.refetch();

    expect(Array.isArray(refetched.data)).toBe(true);
    expect(refetched.data?.[0].id).toBe('connector-1');
  });
});
