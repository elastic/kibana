/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import { fetchEpisodeConnectorSources } from '../apis/fetch_episode_connector_sources';
import { useFetchEpisodeConnectorSources } from './use_fetch_episode_connector_sources';
import { useSpaceId } from './use_space_id';

jest.mock('../apis/fetch_episode_connector_sources');
jest.mock('./use_space_id');

const mockFetchEpisodeConnectorSources = jest.mocked(fetchEpisodeConnectorSources);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
};

const createWrapper = (queryV2Source = true) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => {
    const qcProvider = React.createElement(QueryClientProvider, { client: queryClient }, children);
    return queryV2Source
      ? qcProvider
      : React.createElement(EpisodeDataSourceProvider, { queryV2Source }, qcProvider);
  };
};

afterEach(() => {
  jest.clearAllMocks();
  mockUseSpaceId.mockReturnValue('default');
});

describe('useFetchEpisodeConnectorSources', () => {
  it('returns connector sources for the time range', async () => {
    mockFetchEpisodeConnectorSources.mockResolvedValue(['datadog', 'zabbix']);

    const { result } = renderHook(
      () =>
        useFetchEpisodeConnectorSources({
          services: mockServices,
          timeRange: mockTimeRange,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['datadog', 'zabbix']);
    expect(mockFetchEpisodeConnectorSources).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        timeRange: mockTimeRange,
        services: mockServices,
      })
    );
  });

  it('skips the fetch when the v2 source is not queried', async () => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeConnectorSources({
          services: mockServices,
          timeRange: mockTimeRange,
        }),
      { wrapper: createWrapper(false) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchEpisodeConnectorSources).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });
});
