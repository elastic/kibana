/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { AlertEpisodeAction } from '../queries/episode_actions_query';
import type { GroupActionRow } from '../queries/group_actions_query';
import type { EpisodeAction } from '../actions/types';
import { createSnoozeAction } from '../actions/snooze';
import { createUnsnoozeAction } from '../actions/unsnooze';
import { fetchEpisodeActions } from '../apis/fetch_episode_actions';
import { fetchGroupActions } from '../apis/fetch_group_actions';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { RuleStateStatus } from '../types/rule_state';
import { createMockServices, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchRule } from './use_fetch_rule';
import { useEpisodeFlapping } from './use_episode_flapping';
import { useEpisodeDetailsHeaderData } from './use_episode_details_header_data';
import { useInvalidateEpisodeQueries } from './use_invalidate_episode_queries';

jest.mock('../apis/fetch_episode_actions');
jest.mock('../apis/fetch_group_actions');
jest.mock('../utils/run_esql_async_search');
jest.mock('./use_fetch_rule');
jest.mock('./use_episode_flapping');

const mockFetchEpisodeActions = jest.mocked(fetchEpisodeActions);
const mockFetchGroupActions = jest.mocked(fetchGroupActions);
const mockRunEsqlAsyncSearch = jest.mocked(runEsqlAsyncSearch);
const mockUseFetchRule = jest.mocked(useFetchRule);
const mockUseEpisodeFlapping = jest.mocked(useEpisodeFlapping);

const mockServices = createMockServices();
const mockSnoozeAction = createSnoozeAction({} as never);
const mockUnsnoozeAction = createUnsnoozeAction({} as never);

// Two rules write the same group hash, i.e. two ungrouped rules.
const GROUP_HASH = 'shared-group-hash';
const SNOOZED_UNTIL = '2099-01-01T00:00:00.000Z';

const mockEpisodeRow = (episodeId: string, ruleId: string) => ({
  columns: [
    { name: 'episode.id', type: 'keyword' },
    { name: 'episode.status', type: 'keyword' },
    { name: 'rule.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
    { name: 'series_id', type: 'keyword' },
  ],
  values: [[episodeId, 'active', ruleId, GROUP_HASH, `${ruleId}-series`]],
});

const mockEpisodeAction = (episodeId: string, ruleId: string): AlertEpisodeAction => ({
  alert_id: episodeId,
  rule_id: ruleId,
  group_hash: GROUP_HASH,
  last_ack_action: null,
  last_assignee_uid: null,
  last_ack_actor: null,
  last_deactivate_action: null,
  last_deactivate_actor: null,
  last_tags: null,
});

const mockGroupAction = (ruleId: string | null): GroupActionRow => ({
  group_hash: GROUP_HASH,
  rule_id: ruleId,
  last_deactivate_action: null,
  last_snooze_action: 'snooze',
  snoozed_until: SNOOZED_UNTIL,
  last_snooze_actor: 'user-1',
  last_deactivate_actor: null,
});

const renderHeaderData = (episodeId: string) =>
  renderHook(
    () => useEpisodeDetailsHeaderData({ episodeId, groupHash: GROUP_HASH, services: mockServices }),
    { wrapper: createQueryClientWrapper(createTestQueryClient()) }
  );

const getCompatibleActionIds = (
  episode: ReturnType<typeof renderHeaderData>['result']['current']['episode']
) =>
  episode
    ? [mockSnoozeAction, mockUnsnoozeAction]
        .filter((action: EpisodeAction) => action.isCompatible({ episodes: [episode] }))
        .map(({ id }) => id)
    : [];

describe('useEpisodeDetailsHeaderData action state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.loading, ruleId: 'rule-a' },
    } as never);
    mockUseEpisodeFlapping.mockReturnValue({ isFlapping: false } as never);
  });

  describe('with two rules on one group hash', () => {
    beforeEach(() => {
      mockRunEsqlAsyncSearch.mockImplementation(async ({ params }) =>
        String(params.query).includes('"ep-b"')
          ? mockEpisodeRow('ep-b', 'rule-b')
          : mockEpisodeRow('ep-a', 'rule-a')
      );
      mockFetchEpisodeActions.mockImplementation(async ({ episodeIds }) =>
        episodeIds.map((id) => mockEpisodeAction(id, id === 'ep-b' ? 'rule-b' : 'rule-a'))
      );
    });

    it('offers unsnooze for the alert of the snoozed rule', async () => {
      mockFetchGroupActions.mockResolvedValue([mockGroupAction('rule-a')]);

      const { result } = renderHeaderData('ep-a');

      await waitFor(() => expect(result.current.isActionStateLoaded).toBe(true));
      expect(result.current.episode).toMatchObject({
        last_snooze_action: 'snooze',
        snoozed_until: SNOOZED_UNTIL,
      });
      expect(getCompatibleActionIds(result.current.episode)).toEqual([mockUnsnoozeAction.id]);
    });

    it("doesn't snooze the alert of the other rule", async () => {
      mockFetchGroupActions.mockResolvedValue([mockGroupAction('rule-a')]);

      const { result } = renderHeaderData('ep-b');

      await waitFor(() => expect(result.current.isActionStateLoaded).toBe(true));
      expect(result.current.episode).toMatchObject({
        last_snooze_action: null,
        snoozed_until: null,
      });
      expect(getCompatibleActionIds(result.current.episode)).toEqual([mockSnoozeAction.id]);
    });

    it('falls back to the snooze without a rule for both rules', async () => {
      mockFetchGroupActions.mockResolvedValue([mockGroupAction(null)]);

      const { result } = renderHeaderData('ep-b');

      await waitFor(() => expect(result.current.isActionStateLoaded).toBe(true));
      expect(getCompatibleActionIds(result.current.episode)).toEqual([mockUnsnoozeAction.id]);
    });
  });

  it('picks up the new state when the queries are refreshed after an action', async () => {
    mockRunEsqlAsyncSearch.mockResolvedValue(mockEpisodeRow('ep-a', 'rule-a'));
    mockFetchGroupActions.mockResolvedValue([]);
    mockFetchEpisodeActions.mockResolvedValue([mockEpisodeAction('ep-a', 'rule-a')]);

    const { result } = renderHook(
      () => ({
        headerData: useEpisodeDetailsHeaderData({
          episodeId: 'ep-a',
          groupHash: GROUP_HASH,
          services: mockServices,
        }),
        invalidateEpisodeQueries: useInvalidateEpisodeQueries(),
      }),
      { wrapper: createQueryClientWrapper(createTestQueryClient()) }
    );

    await waitFor(() => expect(result.current.headerData.isActionStateLoaded).toBe(true));
    expect(result.current.headerData.episode).toMatchObject({ last_ack_action: null });

    // The ack action writes its doc, then calls the `onSuccess` refresh.
    mockFetchEpisodeActions.mockResolvedValue([
      { ...mockEpisodeAction('ep-a', 'rule-a'), last_ack_action: 'ack' },
    ]);
    await act(() => result.current.invalidateEpisodeQueries());

    await waitFor(() =>
      expect(result.current.headerData.episode).toMatchObject({ last_ack_action: 'ack' })
    );
  });

  describe('while the actions load', () => {
    beforeEach(() => {
      mockRunEsqlAsyncSearch.mockResolvedValue(mockEpisodeRow('ep-a', 'rule-a'));
      mockFetchGroupActions.mockResolvedValue([]);
    });

    it('reports the action state as loaded only once the actions return', async () => {
      let resolveEpisodeActions: (rows: AlertEpisodeAction[]) => void = () => {};
      mockFetchEpisodeActions.mockReturnValue(
        new Promise((resolve) => {
          resolveEpisodeActions = resolve;
        })
      );

      const { result } = renderHeaderData('ep-a');

      await waitFor(() => expect(result.current.episode).toBeDefined());
      expect(result.current.isActionStateLoaded).toBe(false);

      resolveEpisodeActions([{ ...mockEpisodeAction('ep-a', 'rule-a'), last_ack_action: 'ack' }]);

      await waitFor(() => expect(result.current.isActionStateLoaded).toBe(true));
      expect(result.current.episode).toMatchObject({ last_ack_action: 'ack' });
    });

    it("doesn't report the action state as loaded when the actions fail", async () => {
      mockFetchEpisodeActions.mockRejectedValue(new Error('boom'));

      const { result } = renderHeaderData('ep-a');

      await waitFor(() => expect(result.current.episode).toBeDefined());
      await waitFor(() => expect(mockFetchEpisodeActions).toHaveBeenCalled());
      expect(result.current.isActionStateLoaded).toBe(false);
    });
  });
});
