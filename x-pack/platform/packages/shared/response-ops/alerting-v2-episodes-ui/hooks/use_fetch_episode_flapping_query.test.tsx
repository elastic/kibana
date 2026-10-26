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
import { buildEpisodeFlappingEsqlQuery } from '../queries/episode_flapping_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeFlappingQuery } from './use_fetch_episode_flapping_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const { ACTIVE } = ALERT_EPISODE_STATUS;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeFlappingQuery', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('runs the dedicated newest-first query bounded to the look-back window', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'episode.status', type: 'keyword' }],
      values: [[ACTIVE]],
    });

    const episodeId = 'ep-1';
    const { result } = renderHook(
      () =>
        useFetchEpisodeFlappingQuery({
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
          query: buildEpisodeFlappingEsqlQuery(DEFAULT_SPACE_ID, episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );
  });
});
