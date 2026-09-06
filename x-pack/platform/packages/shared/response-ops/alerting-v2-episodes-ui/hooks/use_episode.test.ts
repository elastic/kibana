/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useEpisode } from './use_episode';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';
import { useFetchRule } from './use_fetch_rule';
import { createMockSpaces } from './test_utils';
import { RuleStateStatus } from '../types/rule_state';

jest.mock('./use_fetch_episode_query');
jest.mock('./use_fetch_rule');

const mockUseFetchEpisodeQuery = jest.mocked(useFetchEpisodeQuery);
const mockUseFetchRule = jest.mocked(useFetchRule);

const mockEpisode = {
  'episode.id': 'ep-1',
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
} as AlertEpisode;

const services = {
  data: dataPluginMock.createStartContract(),
  spaces: createMockSpaces(),
  http: httpServiceMock.createStartContract(),
};

const loadedRuleState = {
  status: RuleStateStatus.loaded,
  ruleId: 'rule-1',
  rule: {
    id: 'rule-1',
    metadata: { name: 'Rule A' },
    grouping: { fields: ['host.name'] },
  },
} as const;

describe('useEpisode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: mockEpisode,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFetchEpisodeQuery>);
    mockUseFetchRule.mockReturnValue({
      ruleState: loadedRuleState,
    } as unknown as ReturnType<typeof useFetchRule>);
  });

  it('returns the episode plus rule display fields when the rule is loaded', () => {
    const { result } = renderHook(() =>
      useEpisode({ episodeId: 'ep-1', groupHash: 'gh-1', services })
    );

    expect(mockUseFetchEpisodeQuery).toHaveBeenCalledWith({
      episodeId: 'ep-1',
      groupHash: 'gh-1',
      services: { data: services.data, spaces: services.spaces },
    });
    expect(mockUseFetchRule).toHaveBeenCalledWith({
      id: 'rule-1',
      http: services.http,
    });
    expect(result.current).toEqual({
      episode: mockEpisode,
      ruleState: loadedRuleState,
      ruleName: 'Rule A',
      groupingFields: ['host.name'],
      isRuleLoaded: true,
      isLoading: false,
      isError: false,
    });
  });

  it('falls back to episode_data.rule_name when the rule is not loaded', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: {
        ...mockEpisode,
        episode_data: JSON.stringify({ rule_name: 'Snapshot Rule' }),
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFetchEpisodeQuery>);
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.loading, ruleId: 'rule-1' },
    } as unknown as ReturnType<typeof useFetchRule>);

    const { result } = renderHook(() => useEpisode({ episodeId: 'ep-1', services }));

    expect(result.current.ruleName).toBe('Snapshot Rule');
    expect(result.current.groupingFields).toBeUndefined();
    expect(result.current.isRuleLoaded).toBe(false);
  });

  it('forwards episode query loading and error flags', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useFetchEpisodeQuery>);
    mockUseFetchRule.mockReturnValue({
      ruleState: { status: RuleStateStatus.idle },
    } as unknown as ReturnType<typeof useFetchRule>);

    const { result } = renderHook(() => useEpisode({ episodeId: 'ep-1', services }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.episode).toBeUndefined();
    expect(result.current.ruleName).toBeUndefined();
  });
});
