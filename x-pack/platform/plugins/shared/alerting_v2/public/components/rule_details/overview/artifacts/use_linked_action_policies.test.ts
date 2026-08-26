/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import {
  useLinkedActionPolicies,
  LINKED_ACTION_POLICIES_FETCH_LIMIT,
  sortMatchedActionPolicies,
} from './use_linked_action_policies';

const mockUseMatchedActionPolicies = jest.fn();
const mockHttp = { fake: 'http-start-contract' };

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  useMatchedActionPolicies: (params: unknown) => mockUseMatchedActionPolicies(params),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => (token === 'CoreStart(http)' ? mockHttp : {}),
  CoreStart: (key: string) => `CoreStart(${key})`,
}));

const RULE_ID = 'rule-1';

const buildItem = (
  category: MatchedActionPolicy['category'],
  overrides: Partial<MatchedActionPolicy['actionPolicy']> = {}
): MatchedActionPolicy => ({
  actionPolicy: {
    id: 'policy-1',
    name: 'Policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: null,
    group_by: null,
    tags: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    auth: { owner: 'user', created_by_user: true },
    created_by: 'user',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'user',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
  category,
});

describe('sortMatchedActionPolicies', () => {
  it('orders matching-criteria before catch-all, then by name', () => {
    const sorted = sortMatchedActionPolicies([
      buildItem('global', { id: 'catch-z', name: 'Z catch-all' }),
      buildItem('global-filtered', { id: 'match-b', name: 'B matching' }),
      buildItem('global', { id: 'catch-a', name: 'A catch-all' }),
      buildItem('global-filtered', { id: 'match-a', name: 'A matching' }),
    ]);

    expect(sorted.map((item) => item.actionPolicy.id)).toEqual([
      'match-a',
      'match-b',
      'catch-a',
      'catch-z',
    ]);
  });
});

describe('useLinkedActionPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      total: 0,
    });
  });

  it('delegates to useMatchedActionPolicies with the injected http contract and ruleId', () => {
    renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith({ http: mockHttp, ruleId: RULE_ID });
  });

  it('returns matched items with loading and error flags', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildItem('global', { id: 'catch-all-1' }),
        buildItem('global-filtered', { id: 'filtered-1' }),
      ],
      total: 2,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.isMatchTruncated).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns matched items sorted matching-criteria first', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildItem('global', { id: 'catch-all-1', name: 'Catch-all' }),
        buildItem('global-filtered', { id: 'filtered-1', name: 'Matching' }),
      ],
      total: 2,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(result.current.items.map((item) => item.actionPolicy.id)).toEqual([
      'filtered-1',
      'catch-all-1',
    ]);
  });

  it('flags truncated counts when the space has more policies than the evaluation limit', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [buildItem('global-filtered')],
      total: LINKED_ACTION_POLICIES_FETCH_LIMIT + 1,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.isMatchTruncated).toBe(true);
  });

  it('passes through the loading state', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: true,
      error: null,
      items: [],
      total: 0,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces API errors', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: new Error('network error'),
      items: [],
      total: 0,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID));

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.items).toEqual([]);
  });
});
