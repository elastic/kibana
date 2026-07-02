/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildEpisodeSeverityTransitionsEsqlQuery } from '../queries/episode_severity_transitions_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeSeverityTransitionsQuery } from './use_fetch_episode_severity_transitions_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeSeverityTransitionsQuery', () => {
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
        useFetchEpisodeSeverityTransitionsQuery({
          episodeId: undefined,
          services: { data, spaces: mockSpaces },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('loads object rows from async ES|QL search', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'severity', type: 'keyword' },
        { name: 'event_count', type: 'integer' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'high', 2]],
    });

    const episodeId = 'ep-1';
    const { result } = renderHook(
      () =>
        useFetchEpisodeSeverityTransitionsQuery({
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
          query: buildEpisodeSeverityTransitionsEsqlQuery(DEFAULT_SPACE_ID, episodeId).print(
            'basic'
          ),
          time_zone: 'UTC',
        }),
      })
    );

    expect(result.current.data).toEqual([
      {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        severity: 'high',
        event_count: 2,
      },
    ]);
  });
});
