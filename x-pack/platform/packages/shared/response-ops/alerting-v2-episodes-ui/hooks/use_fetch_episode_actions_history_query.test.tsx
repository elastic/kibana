/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildEpisodeActionsHistoryQuery } from '../queries/episode_actions_history_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeActionsHistoryQuery } from './use_fetch_episode_actions_history_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const ACTIONS_COLUMNS = [
  { name: '_id', type: 'keyword' },
  { name: '@timestamp', type: 'date' },
  { name: 'action_type', type: 'keyword' },
  { name: 'actor', type: 'keyword' },
  { name: 'episode_id', type: 'keyword' },
  { name: 'group_hash', type: 'keyword' },
  { name: 'tags', type: 'keyword' },
  { name: 'assignee_uid', type: 'keyword' },
  { name: 'expiry', type: 'date' },
  { name: 'reason', type: 'keyword' },
];

const makeActionRow = (id: string, ts: string) => [
  id,
  ts,
  'ack',
  'user-uid-1',
  'ep-1',
  'hash-1',
  null,
  null,
  null,
  null,
];

describe('useFetchEpisodeActionsHistoryQuery', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();
  const queryClient = createTestQueryClient();
  const wrapper = createQueryClientWrapper(queryClient);
  const episodeId = 'ep-1';
  const groupHash = 'hash-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not run when episodeId or groupHash is undefined', () => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeActionsHistoryQuery({
          episodeId: undefined,
          groupHash,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    expect(result.current.entries).toEqual([]);
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
    // A disabled React Query v4 query reports isLoading: true forever, which would wrongly
    // gate the timeline behind a perpetual spinner. isInitialLoading is false here instead.
    expect(result.current.isLoading).toBe(false);
  });

  it('loads the first page and maps rows', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: ACTIONS_COLUMNS,
      values: [makeActionRow('id-1', '2024-01-02T00:00:00.000Z')],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeActionsHistoryQuery({
          episodeId,
          groupHash,
          services: { data, spaces: mockSpaces },
          pageSize: 2,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: buildEpisodeActionsHistoryQuery(DEFAULT_SPACE_ID, episodeId, groupHash, {
            limit: 2,
          }).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );
    expect(result.current.entries).toEqual([
      expect.objectContaining({ _id: 'id-1', '@timestamp': '2024-01-02T00:00:00.000Z' }),
    ]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('offers a next page when the page comes back full, none when short', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: ACTIONS_COLUMNS,
      values: [
        makeActionRow('id-1', '2024-01-02T00:02:00.000Z'),
        makeActionRow('id-2', '2024-01-02T00:01:00.000Z'),
      ],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeActionsHistoryQuery({
          episodeId,
          groupHash,
          services: { data, spaces: mockSpaces },
          pageSize: 2,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(true);

    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: ACTIONS_COLUMNS,
      values: [makeActionRow('id-3', '2024-01-02T00:00:00.000Z')],
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(runEsqlAsyncSearchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.stringContaining('@timestamp <= "2024-01-02T00:01:00.000Z"'),
        }),
      })
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it('dedups records that straddle the keyset page boundary by _id', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: ACTIONS_COLUMNS,
      values: [
        makeActionRow('id-1', '2024-01-02T00:02:00.000Z'),
        makeActionRow('id-2', '2024-01-02T00:01:00.000Z'),
      ],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeActionsHistoryQuery({
          episodeId,
          groupHash,
          services: { data, spaces: mockSpaces },
          pageSize: 2,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Inclusive cursor re-fetches the boundary row `id-2` alongside the new `id-3`.
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: ACTIONS_COLUMNS,
      values: [
        makeActionRow('id-2', '2024-01-02T00:01:00.000Z'),
        makeActionRow('id-3', '2024-01-02T00:00:00.000Z'),
      ],
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(result.current.entries.map((e) => e._id)).toEqual(['id-1', 'id-2', 'id-3'])
    );
  });
});
