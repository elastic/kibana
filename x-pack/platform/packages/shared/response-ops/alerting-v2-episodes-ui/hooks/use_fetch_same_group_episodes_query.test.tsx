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
  type RelatedEpisodesScope,
} from '../queries/related_episodes_query';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchSameGroupEpisodesQuery } from './use_fetch_same_group_episodes_query';

jest.mock('../apis/fetch_related_episodes');

const fetchRelatedEpisodesMock = jest.mocked(fetchRelatedEpisodes);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchSameGroupEpisodesQuery', () => {
  const mockToastDanger = jest.fn();
  const mockExpressions = {} as ExpressionsStart;
  const mockSpaces = createMockSpaces();

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
          scope: { type: 'rule', ruleId: 'r1' },
          excludeEpisodeId: 'e1',
          pageSize: 5,
          groupHash: undefined,
          services: { expressions: mockExpressions, spaces: mockSpaces },
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchRelatedEpisodesMock).not.toHaveBeenCalled();
  });

  it('fetches with sameGroup ES|QL when rule, episode, and group hash are set', async () => {
    fetchRelatedEpisodesMock.mockResolvedValue([]);

    const scope: RelatedEpisodesScope = { type: 'rule', ruleId: 'rule-1' };
    const excludeEpisodeId = 'ep-current';
    const groupHash = 'gh-1';
    const pageSize = 5;
    const sameGroupQuery = buildRelatedBaseQuery(DEFAULT_SPACE_ID, scope, excludeEpisodeId);
    sameGroupQuery.where`group_hash == ${groupHash}`;
    const expectedQuery = finishRelatedEpisodesQuery(sameGroupQuery).print('basic');

    const { result } = renderHook(
      () =>
        useFetchSameGroupEpisodesQuery({
          scope,
          excludeEpisodeId,
          pageSize,
          groupHash,
          services: { expressions: mockExpressions, spaces: mockSpaces },
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

  it('scopes the query to the source when the episode has no rule', async () => {
    fetchRelatedEpisodesMock.mockResolvedValue([]);

    const scope: RelatedEpisodesScope = { type: 'source', source: 'zabbix' };
    const sameGroupQuery = buildRelatedBaseQuery(DEFAULT_SPACE_ID, scope, 'ep-current');
    sameGroupQuery.where`group_hash == ${'gh-1'}`;
    const expectedQuery = finishRelatedEpisodesQuery(sameGroupQuery).print('basic');

    const { result } = renderHook(
      () =>
        useFetchSameGroupEpisodesQuery({
          scope,
          excludeEpisodeId: 'ep-current',
          pageSize: 5,
          groupHash: 'gh-1',
          services: { expressions: mockExpressions, spaces: mockSpaces },
          toastDanger: mockToastDanger,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchRelatedEpisodesMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: expectedQuery })
    );
  });
});
