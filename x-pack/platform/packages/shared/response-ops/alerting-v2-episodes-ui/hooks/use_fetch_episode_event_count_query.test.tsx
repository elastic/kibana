/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeEventCountQuery } from '@kbn/alerting-v2-common-queries';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeEventCountQuery } from './use_fetch_episode_event_count_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeEventCountQuery', () => {
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
        useFetchEpisodeEventCountQuery({
          episodeId: undefined,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('returns the event count', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'event_count', type: 'long' }],
      values: [[4321]],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeEventCountQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: buildEpisodeEventCountQuery(DEFAULT_SPACE_ID, 'ep-1').print('basic'),
        }),
      })
    );
    expect(result.current.data).toBe(4321);
  });

  it('returns 0 when no row comes back', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'event_count', type: 'long' }],
      values: [],
    });

    const { result } = renderHook(
      () =>
        useFetchEpisodeEventCountQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });
});
