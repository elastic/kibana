/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyResponseSchema,
  findActionPoliciesResponseSchema,
  bulkActionActionPoliciesResponseSchema,
} from './action_policy_response_schema';

const validResponse = {
  id: 'np-1',
  version: 'WzEsMV0=',
  name: 'My Policy',
  description: 'A test policy',
  enabled: true,
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  matcher: 'host.name: "server-1"',
  groupBy: ['host.name'],
  tags: ['production'],
  groupingMode: 'per_episode' as const,
  throttle: { strategy: 'on_status_change' as const },
  snoozedUntil: null,
  auth: { owner: 'user-1', createdByUser: true },
  createdBy: 'user-1',
  createdByUsername: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'user-1',
  updatedByUsername: 'admin',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
      groupBy: null,
      tags: null,
      groupingMode: null,
      throttle: null,
      snoozedUntil: null,
      createdBy: null,
      createdByUsername: null,
      updatedBy: null,
      updatedByUsername: null,
    });
    expect(result.matcher).toBeNull();
    expect(result.groupBy).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.groupingMode).toBeNull();
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
      perPage: 10,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('accepts an empty items array', () => {
    const result = findActionPoliciesResponseSchema.parse({
      items: [],
      total: 0,
      page: 1,
      perPage: 10,
    });
    expect(result.items).toHaveLength(0);
  });

  it('rejects missing total', () => {
    expect(() =>
      findActionPoliciesResponseSchema.parse({
        items: [],
        page: 1,
        perPage: 10,
      })
    ).toThrow();
  });
});

describe('bulkActionActionPoliciesResponseSchema', () => {
  it('accepts a valid bulk response', () => {
    const result = bulkActionActionPoliciesResponseSchema.parse({
      processed: 5,
      total: 6,
      errors: [{ id: 'np-2', message: 'Not found' }],
    });
    expect(result.processed).toBe(5);
    expect(result.errors).toHaveLength(1);
  });

  it('accepts empty errors', () => {
    const result = bulkActionActionPoliciesResponseSchema.parse({
      processed: 3,
      total: 3,
      errors: [],
    });
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing processed', () => {
    expect(() =>
      bulkActionActionPoliciesResponseSchema.parse({
        total: 3,
        errors: [],
      })
    ).toThrow();
  });
});
