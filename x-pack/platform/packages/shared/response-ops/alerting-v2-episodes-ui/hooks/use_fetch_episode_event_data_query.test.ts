/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { buildEpisodeDataRequest, buildEpisodeQuery } from '@kbn/alerting-v2-common-queries';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeEventDataQuery } from './use_fetch_episode_event_data_query';

jest.mock('../utils/run_esql_async_search');

const mockRunEsqlAsyncSearch = jest.mocked(runEsqlAsyncSearch);
const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const mockDataResponse = (episodeData: string | null, timestamp: string | null) => ({
  columns: [
    { name: '@timestamp', type: 'date' as const },
    { name: 'episode_data', type: 'keyword' as const },
  ],
  values: episodeData === null && timestamp === null ? [] : [[timestamp, episodeData]],
});

const mockEpisodeResponse = (lastTimestamp: string) => ({
  columns: [
    { name: 'episode.id', type: 'keyword' as const },
    { name: 'last_timestamp', type: 'date' as const },
  ],
  values: [['ep-1', lastTimestamp]],
});

// Answers each of the two parallel requests by its query.
const mockResponses = ({
  episodeData,
  episode,
}: {
  episodeData: ReturnType<typeof mockDataResponse>;
  episode: ReturnType<typeof mockEpisodeResponse>;
}) =>
  mockRunEsqlAsyncSearch.mockImplementation(async ({ params }) =>
    String(params.query).includes('JSON_EXTRACT') ? episodeData : episode
  );

describe('useFetchEpisodeEventDataQuery', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderEventDataHook = () =>
    renderHook(
      () =>
        useFetchEpisodeEventDataQuery({
          episodeId: 'ep-1',
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

  it('does not run when episodeId is undefined', () => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeEventDataQuery({
          episodeId: undefined,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRunEsqlAsyncSearch).not.toHaveBeenCalled();
  });

  it('parses the latest data, returns its timestamp, and flags fresh data as not stale', async () => {
    const rawData = { threshold_met: true, current_value: 95 };
    const timestamp = '2026-04-29T10:00:00.000Z';
    mockResponses({
      episodeData: mockDataResponse(JSON.stringify(rawData), timestamp),
      episode: mockEpisodeResponse(timestamp),
    });

    const { result } = renderEventDataHook();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const dataRequest = buildEpisodeDataRequest(DEFAULT_SPACE_ID, 'ep-1');
    expect(mockRunEsqlAsyncSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        params: expect.objectContaining({
          query: dataRequest.query.print('basic'),
          filter: dataRequest.filter,
          time_zone: 'UTC',
        }),
      })
    );
    expect(mockRunEsqlAsyncSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: buildEpisodeQuery(DEFAULT_SPACE_ID, 'ep-1').print('basic'),
        }),
      })
    );
    expect(result.current.data).toEqual({
      data: rawData,
      dataTimestamp: timestamp,
      isStale: false,
    });
  });

  it('flags data as stale when a more recent event without data exists', async () => {
    const rawData = { threshold_met: true };
    const dataTimestamp = '2026-04-29T10:00:00.000Z';
    mockResponses({
      episodeData: mockDataResponse(JSON.stringify(rawData), dataTimestamp),
      episode: mockEpisodeResponse('2026-04-29T10:05:00.000Z'),
    });

    const { result } = renderEventDataHook();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      data: rawData,
      dataTimestamp,
      isStale: true,
    });
  });

  it('returns null when no event has data', async () => {
    mockResponses({
      episodeData: mockDataResponse(null, null),
      episode: mockEpisodeResponse('2026-04-29T10:05:00.000Z'),
    });

    const { result } = renderEventDataHook();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('returns null when the data is malformed JSON', async () => {
    mockResponses({
      episodeData: mockDataResponse('not-valid-json', '2026-04-29T10:00:00.000Z'),
      episode: mockEpisodeResponse('2026-04-29T10:00:00.000Z'),
    });

    const { result } = renderEventDataHook();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
