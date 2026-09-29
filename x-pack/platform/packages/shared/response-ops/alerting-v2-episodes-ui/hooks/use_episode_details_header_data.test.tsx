/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

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

vi.mock('./use_fetch_episode_query');
vi.mock('./use_fetch_episode_actions');
vi.mock('./use_fetch_group_actions');
vi.mock('./use_fetch_rule');
vi.mock('./use_episode_flapping');

const mockUseFetchEpisodeQuery = vi.mocked(useFetchEpisodeQuery);
const mockUseFetchEpisodeActions = vi.mocked(useFetchEpisodeActions);
const mockUseFetchGroupActions = vi.mocked(useFetchGroupActions);
const mockUseFetchRule = vi.mocked(useFetchRule);
const mockUseEpisodeFlapping = vi.mocked(useEpisodeFlapping);
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
});
