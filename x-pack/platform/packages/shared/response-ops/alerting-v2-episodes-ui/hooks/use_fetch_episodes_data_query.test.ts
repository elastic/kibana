/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { fetchEpisodesData } from '../apis/fetch_episodes_data';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeDataQuery } from './use_fetch_episode_data_query';
import { useFetchEpisodesDataQuery, withEpisodesData } from './use_fetch_episodes_data_query';

jest.mock('../apis/fetch_episodes_data');
jest.mock('../utils/run_esql_async_search');

const mockFetchEpisodesData = jest.mocked(fetchEpisodesData);
const mockRunEsqlAsyncSearch = jest.mocked(runEsqlAsyncSearch);
const mockServices = {
  data: dataPluginMock.createStartContract(),
  expressions: expressionsPluginMock.createStartContract(),
  spaces: createMockSpaces(),
};

const renderDataHook = (episodeIds: string[]) =>
  renderHook(() => useFetchEpisodesDataQuery({ episodeIds, services: mockServices }), {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });

describe('useFetchEpisodesDataQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not run without episodes', () => {
    renderDataHook([]);

    expect(mockFetchEpisodesData).not.toHaveBeenCalled();
  });

  it('returns the data by episode id', async () => {
    mockFetchEpisodesData.mockResolvedValue([
      { 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' },
    ]);

    const { result } = renderDataHook(['ep-1', 'ep-2']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEpisodesData).toHaveBeenCalledWith(
      expect.objectContaining({ episodeIds: ['ep-1', 'ep-2'] })
    );
    expect(result.current.data?.get('ep-1')).toBe('{"host":"web-01"}');
    expect(result.current.data?.has('ep-2')).toBe(false);
  });

  it("doesn't share the cache with the single episode data query", async () => {
    mockFetchEpisodesData.mockResolvedValue([
      { 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' },
    ]);
    mockRunEsqlAsyncSearch.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode_data', type: 'keyword' },
      ],
      values: [['2026-01-01T00:00:00.000Z', '{"host":"web-01"}']],
    });

    // The same alert in a one-item related list and in the details, in one QueryClient.
    const { result } = renderHook(
      () => ({
        batch: useFetchEpisodesDataQuery({ episodeIds: ['ep-1'], services: mockServices }),
        single: useFetchEpisodeDataQuery({ episodeId: 'ep-1', services: mockServices }),
      }),
      { wrapper: createQueryClientWrapper(createTestQueryClient()) }
    );

    await waitFor(() => expect(result.current.batch.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.single.isSuccess).toBe(true));
    expect(result.current.batch.data?.get('ep-1')).toBe('{"host":"web-01"}');
    expect(result.current.single.data).toMatchObject({ episode_data: '{"host":"web-01"}' });
  });
});

describe('withEpisodesData', () => {
  const mockEpisodes = [{ 'episode.id': 'ep-1' }, { 'episode.id': 'ep-2' }] as AlertEpisode[];

  it('adds the data of each episode, and null to the ones without', () => {
    expect(withEpisodesData(mockEpisodes, new Map([['ep-1', '{"host":"web-01"}']]))).toEqual([
      { 'episode.id': 'ep-1', episode_data: '{"host":"web-01"}' },
      { 'episode.id': 'ep-2', episode_data: null },
    ]);
  });

  it('keeps the episodes while the data is missing', () => {
    expect(withEpisodesData(mockEpisodes, undefined)).toEqual([
      { 'episode.id': 'ep-1', episode_data: null },
      { 'episode.id': 'ep-2', episode_data: null },
    ]);
  });
});
