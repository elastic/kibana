/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { fetchEpisodeActions } from '../apis/fetch_episode_actions';
import type { AlertEpisodeAction } from '../queries/episode_actions_query';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeActions } from './use_fetch_episode_actions';

jest.mock('../apis/fetch_episode_actions');

const fetchEpisodeActionsMock = jest.mocked(fetchEpisodeActions);
const mockExpressions = {} as ExpressionsStart;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchEpisodeActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not fetch when episodeIds is empty', () => {
    renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: [],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );
    expect(fetchEpisodeActionsMock).not.toHaveBeenCalled();
  });

  it('fetches and builds episodeActionsMap keyed by episode id', async () => {
    const rows: AlertEpisodeAction[] = [
      { episode_id: 'ep-1', rule_id: 'rule-1', group_hash: 'gh-1', last_ack_action: 'ack' },
    ];
    fetchEpisodeActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['ep-1'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchEpisodeActionsMock).toHaveBeenCalledTimes(1);

    expect(result.current.data?.get('ep-1')).toEqual({
      episodeId: 'ep-1',
      ruleId: 'rule-1',
      groupHash: 'gh-1',
      lastAckAction: 'ack',
    });
  });

  it('keeps the last row when duplicate episode ids are returned', async () => {
    const rows: AlertEpisodeAction[] = [
      { episode_id: 'dup', rule_id: 'r1', group_hash: null, last_ack_action: 'ack' },
      { episode_id: 'dup', rule_id: 'r2', group_hash: null, last_ack_action: 'unack' },
    ];
    fetchEpisodeActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['dup'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data?.get('dup')?.ruleId).toBe('r2'));
  });
});
