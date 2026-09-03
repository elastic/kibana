/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RESULT_WINDOW } from '../../../common/constants';
import type { ListConversationsResponse } from '../../../common/http_api/conversations';
import { dedupeById, getNextConversationPageParam } from './conversation_pagination';

const makePage = (page: number, perPage: number, total: number): ListConversationsResponse => ({
  pagination: { page, per_page: perPage, total },
  results: [],
});

describe('dedupeById', () => {
  it('returns an empty array unchanged', () => {
    expect(dedupeById([])).toEqual([]);
  });

  it('returns a list with no duplicates unchanged', () => {
    const items = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ] as never;
    expect(dedupeById(items)).toEqual(items);
  });

  it('removes duplicate ids, keeping the first occurrence', () => {
    const items = [
      { id: 'a', title: 'First' },
      { id: 'b', title: 'B' },
      { id: 'a', title: 'Duplicate' },
    ] as never;
    const result = dedupeById(items);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'a', title: 'First' });
    expect(result[1]).toEqual({ id: 'b', title: 'B' });
  });

  it('handles multiple different duplicates in one pass', () => {
    const items = [
      { id: 'x', title: '1' },
      { id: 'y', title: '2' },
      { id: 'x', title: '3' },
      { id: 'y', title: '4' },
      { id: 'z', title: '5' },
    ] as never;
    expect(dedupeById(items).map((c: { id: string }) => c.id)).toEqual(['x', 'y', 'z']);
  });
});

describe('getNextConversationPageParam', () => {
  it('returns the next page number when more results remain', () => {
    expect(getNextConversationPageParam(makePage(1, 25, 100))).toBe(2);
    expect(getNextConversationPageParam(makePage(3, 25, 100))).toBe(4);
  });

  it('returns undefined when the last page has been fetched', () => {
    // page 4, per_page 25 → fetched 100 of 100
    expect(getNextConversationPageParam(makePage(4, 25, 100))).toBeUndefined();
  });

  it('returns undefined when fetched count exceeds total', () => {
    // page 5, per_page 25 → fetched 125 of 100
    expect(getNextConversationPageParam(makePage(5, 25, 100))).toBeUndefined();
  });

  it('returns undefined when the next offset would exceed MAX_RESULT_WINDOW', () => {
    // page 400, per_page 25 → next page (401) * 25 = 10025 > 10000
    const perPage = 25;
    const lastReachablePage = MAX_RESULT_WINDOW / perPage; // 400
    expect(
      getNextConversationPageParam(makePage(lastReachablePage, perPage, MAX_RESULT_WINDOW + 1))
    ).toBeUndefined();
  });

  it('returns the next page when the next offset exactly equals MAX_RESULT_WINDOW', () => {
    // page 399, per_page 25 → next page (400) * 25 = 10000 === MAX_RESULT_WINDOW ✓
    const perPage = 25;
    expect(getNextConversationPageParam(makePage(399, perPage, MAX_RESULT_WINDOW + 1))).toBe(400);
  });
});
