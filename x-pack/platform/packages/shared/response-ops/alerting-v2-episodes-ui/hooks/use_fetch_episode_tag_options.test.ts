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
import type { HttpStart } from '@kbn/core-http-browser';
import { useFetchEpisodeTagOptions } from './use_fetch_episode_tag_options';
import { fetchEpisodeTagOptions } from '../apis/fetch_episode_tag_options';
import { createTestEpisodeSource } from '../types/episode_data_source.mock';
import type { EpisodeDataSource } from '../types/episode_data_source';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import { useSpaceId } from './use_space_id';

jest.mock('../apis/fetch_episode_tag_options');
jest.mock('./use_space_id');

const mockFetchEpisodeTagOptions = jest.mocked(fetchEpisodeTagOptions);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
  http: {} as HttpStart,
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
};

const sourceWithTags = (fetchTagOptions: EpisodeDataSource['fetchTagOptions']) =>
  createTestEpisodeSource({ fetchTagOptions });

const createWrapper = (dataSource?: EpisodeDataSource) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => {
    const qcProvider = React.createElement(QueryClientProvider, { client: queryClient }, children);
    return dataSource
      ? React.createElement(EpisodeDataSourceProvider, { dataSource }, qcProvider)
      : qcProvider;
  };
};

const renderTagOptions = (dataSource?: EpisodeDataSource) =>
  renderHook(
    () =>
      useFetchEpisodeTagOptions({
        services: mockServices,
        timeRange: mockTimeRange,
      }),
    { wrapper: createWrapper(dataSource) }
  );

afterEach(() => {
  jest.clearAllMocks();
  mockUseSpaceId.mockReturnValue('default');
});

describe('useFetchEpisodeTagOptions', () => {
  it('returns v2 tags when no additional data source is supplied', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }, { tags: 'staging' }]);

    const { result } = renderTagOptions();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod', 'staging']);
  });

  it('merges source tags with v2 episode tags', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }]);

    const { result } = renderTagOptions(
      sourceWithTags(jest.fn().mockResolvedValue(['staging', 'infra']))
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(expect.arrayContaining(['prod', 'staging', 'infra']));
    expect(result.current.data).toHaveLength(3);
  });

  it('deduplicates tags that appear in both the source and v2', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }, { tags: 'shared-tag' }]);

    const { result } = renderTagOptions(
      sourceWithTags(jest.fn().mockResolvedValue(['shared-tag', 'source-only']))
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod', 'shared-tag', 'source-only']);
  });

  it('returns v2-only tags when a source fetch fails', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }]);

    const { result } = renderTagOptions(
      sourceWithTags(jest.fn().mockRejectedValue(new Error('source failure')))
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod']);
  });

  it('skips additional data source that does not implement tag options', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }]);

    const { result } = renderTagOptions(createTestEpisodeSource());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod']);
  });

  it('returns empty array when both v2 and additional data source return no tags', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([]);

    const { result } = renderTagOptions(sourceWithTags(jest.fn().mockResolvedValue([])));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});
