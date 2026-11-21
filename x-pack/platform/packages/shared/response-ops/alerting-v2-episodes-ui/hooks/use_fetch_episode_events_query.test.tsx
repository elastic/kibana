/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeEventsWithTotalCountQuery } from '@kbn/alerting-v2-common-queries';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeEventsQuery } from './use_fetch_episode_events_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeEventsQuery', () => {
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
        useFetchEpisodeEventsQuery({
          episodeId: undefined,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('loads object rows and the total event count from async ES|QL search', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: 'episode.status', type: 'keyword' },
        { name: 'total_event_count', type: 'long' },
      ],
      values: [
        [ALERT_EPISODE_STATUS.ACTIVE, 1500],
        [ALERT_EPISODE_STATUS.RECOVERING, 1500],
      ],
    });

    const episodeId = 'ep-1';
    const { result } = renderHook(
      () =>
        useFetchEpisodeEventsQuery({
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
          query: buildEpisodeEventsWithTotalCountQuery(DEFAULT_SPACE_ID, episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );

    expect(result.current.data).toEqual({
      eventRows: [
        { 'episode.status': ALERT_EPISODE_STATUS.ACTIVE, total_event_count: 1500 },
        { 'episode.status': ALERT_EPISODE_STATUS.RECOVERING, total_event_count: 1500 },
      ],
      totalEventCount: 1500,
    });
  });

  it('reports a total of 0 when the episode has no events', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'total_event_count', type: 'long' }],
      values: [],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeEventsQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ eventRows: [], totalEventCount: 0 });
  });
});
