/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { matchedActionPoliciesQueryKey } from '@kbn/alerting-v2-rule-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { actionPolicyKeys } from '../../../../hooks/query_key_factory';
import { useLinkedActionPolicies, sortMatchedActionPolicies } from './use_linked_action_policies';

const mockUseMatchedActionPolicies = jest.fn();
const mockHttp = { fake: 'http-start-contract' };

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  matchedActionPoliciesQueryKey: ['matchedActionPolicies'],
  useMatchedActionPolicies: (params: unknown) => mockUseMatchedActionPolicies(params),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => (token === 'CoreStart(http)' ? mockHttp : {}),
  CoreStart: (key: string) => `CoreStart(${key})`,
}));

const RULE_TAGS = ['prod'];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
  logger: { log: () => {}, warn: () => {}, error: () => {} },
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

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

describe('sortMatchedActionPolicies', () => {
  it('orders matching-criteria before catch-all, then by name', () => {
    const sorted = sortMatchedActionPolicies([
      buildItem('catch_all', { id: 'catch-z', name: 'Z catch-all' }),
      buildItem('tags', { id: 'match-b', name: 'B matching' }),
      buildItem('catch_all', { id: 'catch-a', name: 'A catch-all' }),
      buildItem('tags', { id: 'match-a', name: 'A matching' }),
    ]);

    expect(sorted.map((item) => item.action_policy.id)).toEqual([
      'match-a',
      'match-b',
      'catch-a',
      'catch-z',
    ]);
  });

  it('compares names with a fixed English locale', () => {
    const localeCompare = jest.spyOn(String.prototype, 'localeCompare');

    try {
      sortMatchedActionPolicies([
        buildItem('catch_all', { id: 'b', name: 'Beta' }),
        buildItem('catch_all', { id: 'a', name: 'Alpha' }),
      ]);

      expect(localeCompare.mock.calls.some((call) => call[1] === 'en')).toBe(true);
    } finally {
      localeCompare.mockRestore();
    }
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
      evaluatedCount: 0,
      isTruncated: false,
    });
  });

  it('delegates to useMatchedActionPolicies with the injected http contract and tags', () => {
    renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    expect(mockUseMatchedActionPolicies).toHaveBeenCalledWith({ http: mockHttp, tags: RULE_TAGS });
  });

  it('returns matched items sorted matching-criteria first', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildItem('catch_all', { id: 'catch-all-1', name: 'Catch-all' }),
        buildItem('tags', { id: 'filtered-1', name: 'Matching' }),
      ],
      total: 2,
      evaluatedCount: 2,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    expect(result.current.items.map((item) => item.action_policy.id)).toEqual([
      'filtered-1',
      'catch-all-1',
    ]);
    expect(result.current.isMatchTruncated).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('flags truncated matches when some policies were not evaluated', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [buildItem('tags')],
      total: 3,
      evaluatedCount: 2,
      isTruncated: true,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.evaluatedCount).toBe(2);
    expect(result.current.isMatchTruncated).toBe(true);
  });

  it('hides the previous matches while a new tag query is in flight', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      isPreviousData: true,
      error: null,
      items: [buildItem('tags', { id: 'stale', name: 'Stale policy' })],
      total: 1,
      evaluatedCount: 4,
      isTruncated: true,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(['other']), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.evaluatedCount).toBe(0);
    expect(result.current.isMatchTruncated).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('refetches matches when an action policy list query is invalidated', async () => {
    await queryClient.prefetchQuery({
      queryKey: actionPolicyKeys.lists(),
      queryFn: () => null,
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    await queryClient.invalidateQueries({ queryKey: actionPolicyKeys.lists(), exact: false });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: matchedActionPoliciesQueryKey,
        exact: false,
      })
    );
    invalidateQueries.mockRestore();
  });

  it('passes through the loading state', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: true,
      error: null,
      items: [],
      total: 0,
      evaluatedCount: 0,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('surfaces API errors', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: new Error('network error'),
      items: [],
      total: 0,
      evaluatedCount: 0,
      isTruncated: false,
    });

    const { result } = renderHook(() => useLinkedActionPolicies(RULE_TAGS), { wrapper });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.items).toEqual([]);
  });
});
