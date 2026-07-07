/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { buildRuleScopedMatcher } from '@kbn/alerting-v2-rule-form';
import {
  useLinkedActionPolicies,
  LINKED_ACTION_POLICIES_FETCH_LIMIT,
} from './use_linked_action_policies';
import { actionPolicyKeys } from '../../../../hooks/query_key_factory';

const mockListActionPolicies = jest.fn();

jest.mock('../../../../services/action_policies_api', () => ({
  ActionPoliciesApi: 'ActionPoliciesApi',
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'ActionPoliciesApi') {
      return { listActionPolicies: mockListActionPolicies };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const RULE_ID = 'rule-1';

const buildPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse =>
  ({
    id: 'policy-1',
    name: 'Alpha Policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: buildRuleScopedMatcher(RULE_ID),
    groupBy: null,
    tags: null,
    groupingMode: 'per_episode',
    throttle: null,
    snoozedUntil: null,
    auth: { owner: 'user', createdByUser: true },
    createdBy: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'user',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ActionPolicyResponse);

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useLinkedActionPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListActionPolicies.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
    });
  });

  it('does not fetch when ruleId is empty', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = createWrapper(queryClient);
    renderHook(() => useLinkedActionPolicies(''), { wrapper: Wrapper });

    expect(mockListActionPolicies).not.toHaveBeenCalled();
  });

  it('uses a query key nested under action policy list keys', async () => {
    mockListActionPolicies.mockResolvedValue({
      items: [buildPolicy()],
      total: 1,
      page: 1,
      perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = createWrapper(queryClient);
    renderHook(() => useLinkedActionPolicies(RULE_ID), { wrapper: Wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    });

    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(
      actionPolicyKeys.linkedForRule(RULE_ID)
    );
    expect(actionPolicyKeys.linkedForRule(RULE_ID)).toEqual([
      'actionPolicy',
      'list',
      'linkedForRule',
      RULE_ID,
    ]);
  });

  it('fetches policies and returns explicitly linked matches with counts', async () => {
    mockListActionPolicies.mockResolvedValue({
      items: [
        buildPolicy({ id: 'linked-catch-all', name: 'Catch all' }),
        buildPolicy({
          id: 'linked-filtered',
          name: 'Filtered',
          matcher: `rule.id: "${RULE_ID}" and severity: "high"`,
        }),
        buildPolicy({
          id: 'global',
          name: 'Global',
          matcher: null,
        }),
      ],
      total: 3,
      page: 1,
      perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
    });

    const Wrapper = createWrapper(
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
    );
    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListActionPolicies).toHaveBeenCalledWith({
      page: 1,
      perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
    });
    expect(result.current.totalCount).toBe(2);
    expect(result.current.catchAllCount).toBe(1);
    expect(result.current.matchingCriteriaCount).toBe(1);
    expect(result.current.isCountTruncated).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('flags truncated counts when the space has more policies than the fetch limit', async () => {
    mockListActionPolicies.mockResolvedValue({
      items: [buildPolicy({ id: 'linked-1' })],
      total: LINKED_ACTION_POLICIES_FETCH_LIMIT + 1,
      page: 1,
      perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
    });

    const Wrapper = createWrapper(
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
    );
    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.isCountTruncated).toBe(true);
  });

  it('surfaces API errors', async () => {
    mockListActionPolicies.mockRejectedValue(new Error('network error'));

    const Wrapper = createWrapper(
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
    );
    const { result } = renderHook(() => useLinkedActionPolicies(RULE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('network error');
    expect(result.current.totalCount).toBe(0);
  });
});
