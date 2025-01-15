/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery as _useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useGetDataUsageDataStreams } from './use_get_data_streams';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '../../common';
import { coreMock as mockCore } from '@kbn/core/public/mocks';
import { dataUsageTestQueryClientOptions } from '../../common/test_utils';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

const mockServices = mockCore.createStart();
const createWrapper = () => {
  const queryClient = new QueryClient(dataUsageTestQueryClientOptions);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

jest.mock('../utils/use_kibana', () => {
  return {
    useKibanaContextForPlugin: () => ({
      services: mockServices,
    }),
  };
});

const defaultDataStreamsRequestParams = {
  options: { enabled: true },
};

describe('useGetDataUsageDataStreams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the correct API', async () => {
    await renderHook(() => useGetDataUsageDataStreams(defaultDataStreamsRequestParams), {
      wrapper: createWrapper(),
    });

    expect(mockServices.http.get).toHaveBeenCalledWith(DATA_USAGE_DATA_STREAMS_API_ROUTE, {
      signal: expect.any(AbortSignal),
      version: '1',
    });
  });

  it('should not send selected data stream names provided in the param when calling the API', async () => {
    await renderHook(
      () =>
        useGetDataUsageDataStreams({
          ...defaultDataStreamsRequestParams,
          selectedDataStreams: ['ds-1'],
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(mockServices.http.get).toHaveBeenCalledWith(DATA_USAGE_DATA_STREAMS_API_ROUTE, {
      signal: expect.any(AbortSignal),
      version: '1',
    });
  });

  it('should not call the API if disabled', async () => {
    await renderHook(
      () =>
        useGetDataUsageDataStreams({
          ...defaultDataStreamsRequestParams,
          options: { enabled: false },
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(mockServices.http.get).not.toHaveBeenCalled();
  });

  it('should allow custom options to be used', async () => {
    await renderHook(
      () =>
        useGetDataUsageDataStreams({
          selectedDataStreams: undefined,
          options: {
            queryKey: ['test-query-key'],
            enabled: true,
            retry: false,
          },
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['test-query-key'],
        enabled: true,
        retry: false,
      })
    );
  });
});
