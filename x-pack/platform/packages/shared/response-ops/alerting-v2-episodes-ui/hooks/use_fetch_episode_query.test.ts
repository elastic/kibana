/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildEpisodeQuery } from '../queries/episode_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeQuery', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not run when episodeId is undefined', () => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeQuery({
          episodeId: undefined,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('loads the episode row from async ES|QL search', async () => {
    const episodeId = 'ep-1';
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
        { name: 'last_tags', type: 'keyword' },
      ],
      values: [[episodeId, ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1', 'tag-a']],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeQuery({
          episodeId,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: buildEpisodeQuery(DEFAULT_SPACE_ID, episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );

    expect(result.current.data).toMatchObject({
      'episode.id': episodeId,
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      'rule.id': 'rule-1',
      group_hash: 'gh-1',
      last_tags: ['tag-a'],
    });
  });

  it('normalizes last_tags from string to array', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'last_tags', type: 'keyword' },
      ],
      values: [['ep-1', 'single-tag']],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.last_tags).toEqual(['single-tag']);
  });

  it('returns undefined data when no rows come back', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({ columns: [], values: [] });

    const { result } = renderHook(
      () =>
        useFetchEpisodeQuery({
          episodeId: 'ep-missing',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
