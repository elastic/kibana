/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { useDataFields } from './use_data_fields';

jest.mock('@kbn/esql-utils');
jest.mock('../../flyout/utils');

const mockGetESQLAdHocDataview = jest.mocked(getESQLAdHocDataview);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDataFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches fields when query is provided', async () => {
    const mockFields = {
      '@timestamp': { name: '@timestamp', type: 'date' },
      message: { name: 'message', type: 'text' },
    };
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
      fields: {
        toSpec: () => mockFields,
      },
    };

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockFields);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLAdHocDataview).toHaveBeenCalled();
  });

  it('returns empty fields when dataView is null', async () => {
    mockGetESQLAdHocDataview.mockResolvedValue(null as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    const testError = new Error('Failed to fetch data view');
    mockGetESQLAdHocDataview.mockRejectedValue(testError);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({});
    expect(result.current.error).toBe(testError);
  });

  it('refetches when query changes', async () => {
    const mockFields = {
      '@timestamp': { name: '@timestamp', type: 'date' },
      message: { name: 'message', type: 'text' },
    };
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
      fields: {
        toSpec: () => mockFields,
      },
    };
    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();
    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      ({ query }) =>
        useDataFields({
          query,
          http,
          dataViews,
        }),
      { initialProps: { query: 'FROM logs-* | LIMIT 10' }, wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(1);

    // Change query
    rerender({ query: 'FROM metrics-* | LIMIT 10' });

    await waitFor(() => {
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(2);
    });
  });
});
