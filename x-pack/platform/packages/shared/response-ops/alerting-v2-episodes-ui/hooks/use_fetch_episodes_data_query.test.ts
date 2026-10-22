/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { fetchEpisodesData } from '../apis/fetch_episodes_data';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodesDataQuery, withEpisodesData } from './use_fetch_episodes_data_query';

jest.mock('../apis/fetch_episodes_data');

const mockFetchEpisodesData = jest.mocked(fetchEpisodesData);
const mockServices = {
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
