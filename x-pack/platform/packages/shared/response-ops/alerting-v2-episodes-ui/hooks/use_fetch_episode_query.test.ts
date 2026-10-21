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
import { buildEpisodeDataRequest, buildEpisodeQuery } from '@kbn/alerting-v2-common-queries';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const GROUP_HASH = 'gh-1';

const mockEpisodeResponse = (episodeId: string) => ({
  columns: [
    { name: 'episode.id', type: 'keyword' },
    { name: 'episode.status', type: 'keyword' },
    { name: 'rule.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
  ],
  values: [[episodeId, ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', GROUP_HASH]],
});

const mockDataResponse = (episodeData: string) => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'episode_data', type: 'keyword' },
  ],
  values: [['2024-03-01T10:00:00Z', episodeData]],
});

const EMPTY_RESPONSE = { columns: [], values: [] };

// Answers each of the two parallel requests by its query.
const mockResponses = ({
  episode,
  episodeData,
}: {
  episode: ReturnType<typeof mockEpisodeResponse> | typeof EMPTY_RESPONSE;
  episodeData: ReturnType<typeof mockDataResponse> | typeof EMPTY_RESPONSE;
}) =>
  runEsqlAsyncSearchMock.mockImplementation(async ({ params }) =>
    String(params.query).includes('JSON_EXTRACT') ? episodeData : episode
  );

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

  it('loads the episode row and its latest data in parallel', async () => {
    const episodeId = 'ep-1';
    mockResponses({
      episode: mockEpisodeResponse(episodeId),
      episodeData: mockDataResponse('{"host":"web-01"}'),
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

    const dataRequest = buildEpisodeDataRequest(DEFAULT_SPACE_ID, episodeId);
    expect(runEsqlAsyncSearchMock).toHaveBeenCalledTimes(2);
    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: buildEpisodeQuery(DEFAULT_SPACE_ID, episodeId).print('basic'),
          time_zone: 'UTC',
        }),
      })
    );
    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: dataRequest.query.print('basic'),
          filter: dataRequest.filter,
        }),
      })
    );

    expect(result.current.data).toMatchObject({
      'episode.id': episodeId,
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      'rule.id': 'rule-1',
      group_hash: GROUP_HASH,
      episode_data: '{"host":"web-01"}',
    });
  });

  it('sets episode_data to null when no event has data', async () => {
    mockResponses({ episode: mockEpisodeResponse('ep-1'), episodeData: EMPTY_RESPONSE });

    const { result } = renderHook(
      () =>
        useFetchEpisodeQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.episode_data).toBeNull();
  });

  it('returns undefined data when no rows come back', async () => {
    mockResponses({ episode: EMPTY_RESPONSE, episodeData: EMPTY_RESPONSE });

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
