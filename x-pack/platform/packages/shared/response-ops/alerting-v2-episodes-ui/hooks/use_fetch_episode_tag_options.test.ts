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
import { fetchV1AlertsTags } from '../apis/classic_alerts_api';
import { useSpaceId } from './use_space_id';

jest.mock('../apis/fetch_episode_tag_options');
jest.mock('../apis/classic_alerts_api');
jest.mock('./use_space_id');

const mockFetchEpisodeTagOptions = jest.mocked(fetchEpisodeTagOptions);
const mockFetchV1AlertsTags = jest.mocked(fetchV1AlertsTags);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');
mockFetchV1AlertsTags.mockResolvedValue([]);

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
  http: {} as HttpStart,
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
};

const wrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

afterEach(() => {
  jest.clearAllMocks();
  mockUseSpaceId.mockReturnValue('default');
  mockFetchV1AlertsTags.mockResolvedValue([]);
});

describe('useFetchEpisodeTagOptions', () => {
  it('returns v2 tags when no v1 tags exist', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }, { tags: 'staging' }]);

    const { result } = renderHook(
      () => useFetchEpisodeTagOptions({ services: mockServices, timeRange: mockTimeRange }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod', 'staging']);
  });

  it('merges v1 alert tags with v2 episode tags', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }]);
    mockFetchV1AlertsTags.mockResolvedValue(['staging', 'infra']);

    const { result } = renderHook(
      () => useFetchEpisodeTagOptions({ services: mockServices, timeRange: mockTimeRange }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(expect.arrayContaining(['prod', 'staging', 'infra']));
    expect(result.current.data).toHaveLength(3);
  });

  it('deduplicates tags that appear in both v1 and v2', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }, { tags: 'shared-tag' }]);
    mockFetchV1AlertsTags.mockResolvedValue(['shared-tag', 'v1-only']);

    const { result } = renderHook(
      () => useFetchEpisodeTagOptions({ services: mockServices, timeRange: mockTimeRange }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod', 'shared-tag', 'v1-only']);
  });

  it('returns v2-only tags when the v1 fetch fails gracefully', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([{ tags: 'prod' }]);
    mockFetchV1AlertsTags.mockRejectedValue(new Error('v1 failure'));

    const { result } = renderHook(
      () => useFetchEpisodeTagOptions({ services: mockServices, timeRange: mockTimeRange }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['prod']);
  });

  it('returns empty array when both sources return no tags', async () => {
    mockFetchEpisodeTagOptions.mockResolvedValue([]);
    mockFetchV1AlertsTags.mockResolvedValue([]);

    const { result } = renderHook(
      () => useFetchEpisodeTagOptions({ services: mockServices, timeRange: mockTimeRange }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});
