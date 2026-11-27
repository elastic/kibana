/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallIncludeEntry, RecallRequest } from '../../common/http_api/recall';
import type { AiIndexSearchResult } from '../ai_indices/data_read_service';
import { createRecallService, type RecallContext } from './service';

const USER_ID = 'user-1';
const QUERY = 'deployment checklist';

describe('createRecallService', () => {
  let search: jest.MockedFunction<RecallContext['aiIndexDataReadService']['search']>;
  let getNow: jest.Mock<number, []>;

  const recall = (overrides: Partial<RecallRequest> = {}) =>
    createRecallService({ getNow }).recall(
      { aiIndexDataReadService: { search } },
      { query: QUERY, user_id: USER_ID, include: ['ai_index:*'], ...overrides }
    );

  beforeEach(() => {
    search = jest.fn();
    search.mockResolvedValue([]);
    getNow = jest.fn<number, []>().mockReturnValue(1_000);
  });

  describe('input validation', () => {
    it.each<[string, Partial<RecallRequest>, RegExp]>([
      ['a blank user_id', { user_id: '   ' }, /user_id/],
      ['a blank query', { query: '   ' }, /query/],
      ['an empty include', { include: [] }, /include/],
      ['an invalid include entry', { include: ['ai_index:Bad'] }, /Bad/],
    ])('rejects %s without searching', async (_label, overrides, pattern) => {
      await expect(recall(overrides)).rejects.toThrow(pattern);
      expect(search).not.toHaveBeenCalled();
    });
  });

  describe('AI index selection', () => {
    it('searches every AI index for ai_index:*', async () => {
      await recall({ include: ['session_events', 'ai_index:*', 'ai_index:ops'] });

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith({ query: QUERY, userId: USER_ID, size: 100 });
    });

    it('searches only the named AI indices for ai_index:<id>', async () => {
      await recall({ include: ['ai_index:ops', 'ai_index:docs', 'ai_index:ops'] });

      expect(search).toHaveBeenCalledWith({
        query: QUERY,
        userId: USER_ID,
        aiIndexIds: ['ops', 'docs'],
        size: 100,
      });
    });

    it.each<[RecallIncludeEntry[]]>([
      [['session_events']],
      [['session_memory']],
      [['session_events', 'session_memory']],
    ])('returns no results without searching for include %j', async (include) => {
      getNow.mockReturnValueOnce(1_000).mockReturnValueOnce(1_004);

      await expect(recall({ include })).resolves.toEqual({
        results: [],
        took_ms: 4,
      });
      expect(search).not.toHaveBeenCalled();
    });
  });

  describe('results', () => {
    it('maps AI index search results to recall results in order', async () => {
      const searchResults: AiIndexSearchResult[] = [
        {
          id: 'ki-1',
          aiIndexId: 'ops',
          date: '2026-11-20T10:00:00.000Z',
          content: 'Deployments require a change ticket',
          attributes: { service: 'checkout', tags: ['deploy'] },
        },
        { id: 'ki-2', aiIndexId: 'docs', content: 'Run the checklist before deploying' },
      ];
      search.mockResolvedValue(searchResults);

      const { results } = await recall();

      expect(results).toEqual([
        {
          id: 'ki-1',
          source: 'ai_index:ops',
          date: '2026-11-20T10:00:00.000Z',
          content: 'Deployments require a change ticket',
          attributes: { service: 'checkout', tags: ['deploy'] },
        },
        { id: 'ki-2', source: 'ai_index:docs', content: 'Run the checklist before deploying' },
      ]);
      expect(results[1]).not.toHaveProperty('date');
      expect(results[1]).not.toHaveProperty('attributes');
    });

    it('measures took_ms from the start of the recall', async () => {
      getNow.mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

      await expect(recall()).resolves.toEqual({ results: [], took_ms: 250 });
    });

    it('clamps took_ms to zero when the clock goes backwards', async () => {
      getNow.mockReturnValueOnce(1_000).mockReturnValueOnce(900);

      await expect(recall()).resolves.toEqual({ results: [], took_ms: 0 });
    });

    it('defaults to the system clock', async () => {
      const response = await createRecallService().recall(
        { aiIndexDataReadService: { search } },
        { query: QUERY, user_id: USER_ID, include: ['ai_index:*'] }
      );

      expect(response.took_ms).toBeGreaterThanOrEqual(0);
    });
  });

  it('propagates search errors', async () => {
    const failure = new Error('cluster unavailable');
    search.mockRejectedValue(failure);

    await expect(recall()).rejects.toBe(failure);
  });
});
