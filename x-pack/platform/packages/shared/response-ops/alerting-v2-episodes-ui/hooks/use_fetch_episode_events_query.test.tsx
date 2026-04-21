/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeEventsEsqlQuery } from '../queries/episode_events_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeEventsQuery } from './use_fetch_episode_events_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeEventsQuery', () => {
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
        useFetchEpisodeEventsQuery({
          episodeId: undefined,
          data,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('loads object rows from async ES|QL search', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'episode.status', type: 'keyword' }],
      values: [[ALERT_EPISODE_STATUS.ACTIVE]],
    });

    const episodeId = 'ep-1';
    const { result } = renderHook(
      () =>
        useFetchEpisodeEventsQuery({
          episodeId,
          data,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: buildEpisodeEventsEsqlQuery(episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );

    expect(result.current.data).toEqual([{ 'episode.status': ALERT_EPISODE_STATUS.ACTIVE }]);
  });
});
