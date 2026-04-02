/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeTagsEsqlQuery } from '../queries/episode_tags_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeTagsQuery } from './use_fetch_episode_tags_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeTagsQuery', () => {
  const data = dataPluginMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not run when episodeId is undefined', () => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeTagsQuery({
          episodeId: undefined,
          data,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('returns the first row as tags payload', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'tags', type: 'keyword' }],
      values: [['svc-a']],
    });

    const episodeId = 'ep-tags';
    const { result } = renderHook(
      () =>
        useFetchEpisodeTagsQuery({
          episodeId,
          data,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: buildEpisodeTagsEsqlQuery(episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );

    expect(result.current.data).toEqual({ tags: 'svc-a' });
  });
});
