/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { RuleStateStatus } from '../types/rule_state';
import { createMockServices } from './test_utils';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';
import { useFetchEpisodeActions } from './use_fetch_episode_actions';
import { useFetchGroupActions } from './use_fetch_group_actions';
import { useFetchRule } from './use_fetch_rule';
import { useEpisodeFlapping } from './use_episode_flapping';
import { useEpisodeDetailsHeaderData } from './use_episode_details_header_data';

jest.mock('./use_fetch_episode_query');
jest.mock('./use_fetch_episode_actions');
jest.mock('./use_fetch_group_actions', () => ({
  ...jest.requireActual('./use_fetch_group_actions'),
  useFetchGroupActions: jest.fn(),
}));
jest.mock('./use_fetch_rule');
jest.mock('./use_episode_flapping');

const mockUseFetchEpisodeQuery = jest.mocked(useFetchEpisodeQuery);
const mockUseFetchEpisodeActions = jest.mocked(useFetchEpisodeActions);
const mockUseFetchGroupActions = jest.mocked(useFetchGroupActions);
const mockUseFetchRule = jest.mocked(useFetchRule);
const mockUseEpisodeFlapping = jest.mocked(useEpisodeFlapping);
const mockServices = createMockServices();

describe('useEpisodeDetailsHeaderData', () => {
  it('remains loading while the rule is loading', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: { 'rule.id': 'rule-1', group_hash: 'group-1' } as AlertEpisode,
      isLoading: false,
    } as never);
    mockUseFetchEpisodeActions.mockReturnValue({ data: new Map(), isLoading: false } as never);
    mockUseFetchGroupActions.mockReturnValue({ data: new Map(), isLoading: false } as never);
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.loading, ruleId: 'rule-1' },
    } as never);
    mockUseEpisodeFlapping.mockReturnValue({ isFlapping: false } as never);

    const { result } = renderHook(() =>
      useEpisodeDetailsHeaderData({
        episodeId: 'episode-1',
        groupHash: 'group-1',
        services: mockServices,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('adds the episode and series action state to the episode', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: {
        'episode.id': 'episode-1',
        'rule.id': 'rule-1',
        group_hash: 'group-1',
      } as AlertEpisode,
      isLoading: false,
    } as never);
    mockUseFetchEpisodeActions.mockReturnValue({
      data: new Map([
        [
          'episode-1',
          {
            episodeId: 'episode-1',
            ruleId: 'rule-1',
            groupHash: 'group-1',
            lastAckAction: 'ack',
            lastAssigneeUid: 'user-1',
            lastAckActor: null,
            lastDeactivateAction: null,
            lastDeactivateActor: null,
            tags: ['tag-a'],
          },
        ],
      ]),
      isLoading: false,
    } as never);
    mockUseFetchGroupActions.mockReturnValue({
      data: new Map([
        [
          'rule-1:group-1',
          {
            groupHash: 'group-1',
            ruleId: 'rule-1',
            lastDeactivateAction: null,
            lastSnoozeAction: 'snooze',
            snoozedUntil: '2026-08-04T00:00:00.000Z',
            tags: [],
            lastSnoozeActor: null,
            lastDeactivateActor: null,
          },
        ],
      ]),
      isLoading: false,
    } as never);
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.loading, ruleId: 'rule-1' },
    } as never);
    mockUseEpisodeFlapping.mockReturnValue({ isFlapping: false } as never);

    const { result } = renderHook(() =>
      useEpisodeDetailsHeaderData({
        episodeId: 'episode-1',
        groupHash: 'group-1',
        services: mockServices,
      })
    );

    expect(result.current.episode).toMatchObject({
      'episode.id': 'episode-1',
      last_ack_action: 'ack',
      last_assignee_uid: 'user-1',
      last_tags: ['tag-a'],
      last_snooze_action: 'snooze',
      snoozed_until: '2026-08-04T00:00:00.000Z',
    });
  });

  it('loads the series actions from the given group hash before the episode loads', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({ data: undefined, isLoading: true } as never);
    mockUseFetchEpisodeActions.mockReturnValue({ data: undefined, isLoading: true } as never);
    mockUseFetchGroupActions.mockReturnValue({ data: undefined, isLoading: true } as never);
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.loading, ruleId: undefined },
    } as never);
    mockUseEpisodeFlapping.mockReturnValue({ isFlapping: false } as never);

    renderHook(() =>
      useEpisodeDetailsHeaderData({
        episodeId: 'episode-1',
        groupHash: 'group-1',
        services: mockServices,
      })
    );

    expect(mockUseFetchEpisodeQuery).toHaveBeenCalledWith(
      expect.not.objectContaining({ groupHash: expect.anything() })
    );
    expect(mockUseFetchGroupActions).toHaveBeenCalledWith(
      expect.objectContaining({ groupHashes: ['group-1'] })
    );
  });
});
