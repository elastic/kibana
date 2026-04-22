/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeEventDataQuery } from '../queries/episode_event_data_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeEventDataQuery } from './use_fetch_episode_event_data_query';

jest.mock('../utils/run_esql_async_search');

const mockRunEsqlAsyncSearch = jest.mocked(runEsqlAsyncSearch);
const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeEventDataQuery', () => {
  const data = dataPluginMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not run when episodeId is undefined', () => {
    const { result } = renderHook(
      () => useFetchEpisodeEventDataQuery({ episodeId: undefined, data }),
      { wrapper }
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRunEsqlAsyncSearch).not.toHaveBeenCalled();
  });

  it('parses the last_data JSON string and returns an object', async () => {
    const rawData = { threshold_met: true, current_value: 95 };
    mockRunEsqlAsyncSearch.mockResolvedValue({
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'last_data', type: 'keyword' },
      ],
      values: [['ep-1', JSON.stringify(rawData)]],
    });

    const { result } = renderHook(
      () => useFetchEpisodeEventDataQuery({ episodeId: 'ep-1', data }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRunEsqlAsyncSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: buildEpisodeEventDataQuery('ep-1').print('basic'),
          time_zone: 'UTC',
        }),
      })
    );
    expect(result.current.data).toEqual(rawData);
  });

  it('returns null when last_data is null (all events had empty data)', async () => {
    mockRunEsqlAsyncSearch.mockResolvedValue({
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'last_data', type: 'keyword' },
      ],
      values: [['ep-1', null]],
    });

    const { result } = renderHook(
      () => useFetchEpisodeEventDataQuery({ episodeId: 'ep-1', data }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('returns null when last_data is malformed JSON', async () => {
    mockRunEsqlAsyncSearch.mockResolvedValue({
      columns: [
        { name: 'episode.id', type: 'keyword' },
        { name: 'last_data', type: 'keyword' },
      ],
      values: [['ep-1', 'not-valid-json']],
    });

    const { result } = renderHook(
      () => useFetchEpisodeEventDataQuery({ episodeId: 'ep-1', data }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
