/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { fetchRelatedEpisodes } from '../apis/fetch_related_episodes';
import {
  buildRelatedBaseQuery,
  finishRelatedEpisodesQuery,
} from '../queries/related_episodes_query';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchSameRuleEpisodesQuery } from './use_fetch_same_rule_episodes_query';

jest.mock('../apis/fetch_related_episodes');

const fetchRelatedEpisodesMock = jest.mocked(fetchRelatedEpisodes);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchSameRuleEpisodesQuery', () => {
  const mockToastDanger = jest.fn();
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('is idle when ruleId or excludeEpisodeId is missing', () => {
    const { result } = renderHook(
      () =>
        useFetchSameRuleEpisodesQuery({
          ruleId: 'r1',
          excludeEpisodeId: undefined,
          pageSize: 5,
          currentGroupHash: 'gh-1',
          expressions: mockExpressions,
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchRelatedEpisodesMock).not.toHaveBeenCalled();
  });

  it('uses buildRelatedBaseQuery + finishRelatedEpisodesQuery when currentGroupHash is undefined', async () => {
    fetchRelatedEpisodesMock.mockResolvedValue([]);

    const ruleId = 'rule-1';
    const excludeEpisodeId = 'ep-current';
    const pageSize = 5;
    const expectedQuery = finishRelatedEpisodesQuery(
      buildRelatedBaseQuery(ruleId, excludeEpisodeId)
    ).print('basic');

    const { result } = renderHook(
      () =>
        useFetchSameRuleEpisodesQuery({
          ruleId,
          excludeEpisodeId,
          pageSize,
          currentGroupHash: undefined,
          expressions: mockExpressions,
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchRelatedEpisodesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize,
        query: expectedQuery,
      })
    );
  });

  it('adds group_hash != when currentGroupHash is set', async () => {
    fetchRelatedEpisodesMock.mockResolvedValue([]);

    const ruleId = 'rule-1';
    const excludeEpisodeId = 'ep-current';
    const currentGroupHash = 'gh-1';
    const pageSize = 5;
    const otherGroupsQuery = buildRelatedBaseQuery(ruleId, excludeEpisodeId);
    otherGroupsQuery.where`group_hash != ${currentGroupHash}`;
    const expectedQuery = finishRelatedEpisodesQuery(otherGroupsQuery).print('basic');

    const { result } = renderHook(
      () =>
        useFetchSameRuleEpisodesQuery({
          ruleId,
          excludeEpisodeId,
          pageSize,
          currentGroupHash,
          expressions: mockExpressions,
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchRelatedEpisodesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize,
        query: expectedQuery,
      })
    );
    expect(result.current.data).toEqual([]);
  });
});
