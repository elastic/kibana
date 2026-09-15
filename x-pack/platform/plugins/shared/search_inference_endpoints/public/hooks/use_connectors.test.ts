/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useConnectors } from './use_connectors';
import { useKibana } from './use_kibana';
import { INFERENCE_CONNECTORS_QUERY_KEY } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useConnectors', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { http: { get: mockGet } } });
  });

  it('calls the connectors API endpoint', async () => {
    const connectors = [{ connectorId: 'c1', name: 'Test Connector', isPreconfigured: false }];
    mockGet.mockResolvedValue({ connectors });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConnectors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/internal/inference/connectors', {});
  });

  it('returns the connectors from the response', async () => {
    const connectors = [
      { connectorId: 'c1', name: 'Test Connector', isPreconfigured: false },
      { connectorId: 'c2', name: 'Another Connector', isPreconfigured: true },
    ];
    mockGet.mockResolvedValue({ connectors });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConnectors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(connectors);
  });

  it('uses the correct query key', async () => {
    mockGet.mockResolvedValue({ connectors: [] });

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useConnectors(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryState([INFERENCE_CONNECTORS_QUERY_KEY])).toBeDefined()
    );
  });

  it('exposes error state on failure', async () => {
    mockGet.mockRejectedValue(new Error('network error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConnectors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
