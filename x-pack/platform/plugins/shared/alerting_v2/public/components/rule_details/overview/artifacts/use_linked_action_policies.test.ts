/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import type { UseMatchedActionPoliciesResult } from '@kbn/alerting-v2-rule-form';
import { useLinkedActionPolicies } from './use_linked_action_policies';

const mockUseMatchedActionPolicies = jest.fn<UseMatchedActionPoliciesResult, [unknown]>();
const mockHttp = { fake: 'http-start-contract' };

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  useMatchedActionPolicies: (params: unknown) => mockUseMatchedActionPolicies(params),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => (token === 'CoreStart(http)' ? mockHttp : {}),
  CoreStart: (key: string) => `CoreStart(${key})`,
}));

const RULE_TAGS = ['prod'];

const buildItem = (
  category: MatchedActionPolicy['category'],
  overrides: Partial<MatchedActionPolicy['action_policy']> = {}
): MatchedActionPolicy => ({
  action_policy: {
    id: 'policy-1',
    name: 'Policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: null,
    group_by: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    created_by: { profile_uid: 'u_user' },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: { profile_uid: 'u_user' },
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
  category,
});

describe('useLinkedActionPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });
  });

  it('delegates to useMatchedActionPolicies with the injected http contract and tags', () => {
    renderHook(() => useLinkedActionPolicies(RULE_TAGS));

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith({ http: mockHttp, tags: RULE_TAGS });
  });

  it('counts items with category "catch_all" as catch-all and "tags" as matching criteria', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildItem('catch_all', { id: 'catch-all-1' }),
        buildItem('tags', { id: 'filtered-1' }),
        buildItem('tags', { id: 'filtered-2' }),
      ],
      evaluatedCount: 3,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS));

    expect(result.current.totalCount).toBe(3);
    expect(result.current.catchAllCount).toBe(1);
    expect(result.current.matchingCriteriaCount).toBe(2);
    expect(result.current.isCountTruncated).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('flags truncated counts when the space has more policies than the evaluation limit', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [buildItem('tags'), buildItem('tags')],
      evaluatedCount: 2,
      isTruncated: true,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS));

    expect(result.current.totalCount).toBe(2);
    expect(result.current.evaluatedCount).toBe(2);
    expect(result.current.isCountTruncated).toBe(true);
  });

  it('passes through the loading state', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: true,
      error: null,
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS));

    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces API errors', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: new Error('network error'),
      items: [],
      evaluatedCount: 0,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS));

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.totalCount).toBe(0);
  });
});
