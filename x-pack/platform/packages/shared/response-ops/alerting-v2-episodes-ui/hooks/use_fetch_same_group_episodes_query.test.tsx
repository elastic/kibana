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
import { useFetchSameGroupEpisodesQuery } from './use_fetch_same_group_episodes_query';

jest.mock('../apis/fetch_related_episodes');

const fetchRelatedEpisodesMock = jest.mocked(fetchRelatedEpisodes);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchSameGroupEpisodesQuery', () => {
  const mockToastDanger = jest.fn();
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('is idle when groupHash is missing', () => {
    const { result } = renderHook(
      () =>
        useFetchSameGroupEpisodesQuery({
          ruleId: 'r1',
          excludeEpisodeId: 'e1',
          pageSize: 5,
          groupHash: undefined,
          expressions: mockExpressions,
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchRelatedEpisodesMock).not.toHaveBeenCalled();
  });

  it('fetches with sameGroup ES|QL when rule, episode, and group hash are set', async () => {
    fetchRelatedEpisodesMock.mockResolvedValue([]);

    const ruleId = 'rule-1';
    const excludeEpisodeId = 'ep-current';
    const groupHash = 'gh-1';
    const pageSize = 5;
    const sameGroupQuery = buildRelatedBaseQuery(ruleId, excludeEpisodeId);
    sameGroupQuery.where`group_hash == ${groupHash}`;
    const expectedQuery = finishRelatedEpisodesQuery(sameGroupQuery).print('basic');

    const { result } = renderHook(
      () =>
        useFetchSameGroupEpisodesQuery({
          ruleId,
          excludeEpisodeId,
          pageSize,
          groupHash,
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
        expressions: mockExpressions,
      })
    );
    expect(result.current.data).toEqual([]);
  });
});
