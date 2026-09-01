/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyResponseSchema,
  findActionPoliciesResponseSchema,
} from './action_policy_response_schema';

const validResponse = {
  id: 'np-1',
  version: 'WzEsMV0=',
  name: 'My Policy',
  description: 'A test policy',
  enabled: true,
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  matcher: 'host.name: "server-1"',
  group_by: ['host.name'],
  tags: ['production'],
  grouping_mode: 'per_episode' as const,
  throttle: { strategy: 'on_status_change' as const, interval: null },
  snoozed_until: null,
  auth: { owner: 'user-1', created_by_user: true },
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'user-1',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('actionPolicyResponseSchema', () => {
  it('accepts a valid full response', () => {
    const result = actionPolicyResponseSchema.parse(validResponse);
    expect(result).toEqual(validResponse);
  });

  it('accepts nullable fields as null', () => {
    const result = actionPolicyResponseSchema.parse({
      ...validResponse,
      version: undefined,
      matcher: null,
      group_by: null,
      tags: null,
      grouping_mode: null,
      throttle: null,
      snoozed_until: null,
      created_by: null,
      updated_by: null,
    });
    expect(result.matcher).toBeNull();
    expect(result.group_by).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.grouping_mode).toBeNull();
    expect(result.throttle).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(() => actionPolicyResponseSchema.parse({})).toThrow();
  });

  it('rejects invalid enabled type', () => {
    expect(() => actionPolicyResponseSchema.parse({ ...validResponse, enabled: 'yes' })).toThrow();
  });
});

describe('findActionPoliciesResponseSchema', () => {
  it('accepts a valid paginated response', () => {
    const result = findActionPoliciesResponseSchema.parse({
      items: [validResponse],
      total: 1,
      page: 1,
      per_page: 10,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('accepts an empty items array', () => {
    const result = findActionPoliciesResponseSchema.parse({
      items: [],
      total: 0,
      page: 1,
      per_page: 10,
    });
    expect(result.items).toHaveLength(0);
  });

  it('rejects missing total', () => {
    expect(() =>
      findActionPoliciesResponseSchema.parse({
        items: [],
        page: 1,
        per_page: 10,
      })
    ).toThrow();
  });
});
