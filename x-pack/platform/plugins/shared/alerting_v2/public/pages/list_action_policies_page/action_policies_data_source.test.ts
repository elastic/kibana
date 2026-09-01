/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  pageMatchedActionPolicies,
  toFindActionPoliciesRequest,
} from './action_policies_data_source';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';

const buildPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  name: 'Alpha',
  description: 'desc',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: null,
  group_by: null,
  tags: ['prod'],
  grouping_mode: 'per_episode',
  throttle: null,
  snoozed_until: null,
  auth: { owner: 'user', created_by_user: true },
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'user',
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('toFindActionPoliciesRequest', () => {
  it('maps camelCase view state to the snake_case request', () => {
    expect(
      toFindActionPoliciesRequest({
        page: 3,
        perPage: 10,
        search: 'slack',
        tags: ['a', 'b'],
        enabled: true,
        sortField: 'name',
        sortOrder: 'asc',
      })
    ).toEqual({
      page: 3,
      per_page: 10,
      search: 'slack',
      tags: ['a', 'b'],
      enabled: true,
      sort_field: 'name',
      sort_order: 'asc',
    });
  });
});

describe('pageMatchedActionPolicies', () => {
  const policies = [
    buildPolicy({ id: 'a', name: 'Alpha', enabled: true, tags: ['prod'] }),
    buildPolicy({
      id: 'b',
      name: 'Beta',
      enabled: false,
      tags: ['staging'],
      updated_at: '2026-01-03T00:00:00.000Z',
    }),
    buildPolicy({ id: 'c', name: 'Catch-all', enabled: true, tags: null, description: 'global' }),
  ];

  const pageAll = {
    pageIndex: 0,
    pageSize: 10,
  };

  it('returns every policy on the first page', () => {
    const result = pageMatchedActionPolicies(policies, pageAll);
    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('filters by search against name and description', () => {
    expect(pageMatchedActionPolicies(policies, { ...pageAll, search: 'beta' }).items).toHaveLength(
      1
    );
    expect(pageMatchedActionPolicies(policies, { ...pageAll, search: 'global' }).items[0].id).toBe(
      'c'
    );
  });

  it('filters by tags and enabled', () => {
    expect(
      pageMatchedActionPolicies(policies, { ...pageAll, tags: ['prod'] }).items.map(
        (item) => item.id
      )
    ).toEqual(['a']);
    expect(
      pageMatchedActionPolicies(policies, { ...pageAll, enabled: false }).items.map(
        (item) => item.id
      )
    ).toEqual(['b']);
  });

  it('sorts by name with a fixed English locale and paginates', () => {
    const result = pageMatchedActionPolicies(policies, {
      sortField: 'name',
      sortOrder: 'desc',
      pageIndex: 0,
      pageSize: 2,
    });
    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.id)).toEqual(['c', 'b']);
  });
});
