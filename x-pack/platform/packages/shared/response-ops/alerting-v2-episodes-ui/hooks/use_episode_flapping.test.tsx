/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useEpisodeFlapping } from './use_episode_flapping';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const { ACTIVE, RECOVERING } = ALERT_EPISODE_STATUS;

describe('useEpisodeFlapping', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns isFlapping false while events are below the threshold', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'episode.status', type: 'keyword' }],
      values: [[ACTIVE], [RECOVERING], [ACTIVE]],
    });

    const { result } = renderHook(
      () => useEpisodeFlapping({ episodeId: 'ep-1', services: { data, spaces: mockSpaces } }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFlapping).toBe(false);
  });

  it('returns isFlapping true when the look-back window meets the threshold', async () => {
    // 5 alternating statuses (4 changes) + 15 ACTIVE = 20 events, threshold met
    const values = [
      [ACTIVE],
      [RECOVERING],
      [ACTIVE],
      [RECOVERING],
      [ACTIVE],
      ...Array.from({ length: 15 }, () => [ACTIVE]),
    ];
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [{ name: 'episode.status', type: 'keyword' }],
      values,
    });

    const { result } = renderHook(
      () => useEpisodeFlapping({ episodeId: 'ep-1', services: { data, spaces: mockSpaces } }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFlapping).toBe(true);
  });
});
