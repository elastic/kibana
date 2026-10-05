/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionPolicyDataSchema } from './action_policy_data_schema';
import {
  actionPolicyResponseSchema,
  findActionPoliciesResponseSchema,
} from './action_policy_response_schema';

const validResponse = {
  id: 'np-1',
  name: 'My Policy',
  description: 'A test policy',
  enabled: true,
  destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  matcher: { expression: 'host.name: "server-1"' },
  group_by: ['host.name'],
  grouping_mode: 'per_episode' as const,
  throttle: { strategy: 'on_status_change' as const },
  created_by: { profile_uid: 'user-1' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: { profile_uid: 'user-1' },
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('actionPolicyResponseSchema', () => {
  it('accepts a valid full response', () => {
    const result = actionPolicyResponseSchema.parse(validResponse);
    expect(result).toEqual(validResponse);
  });

  it('omits every unset field rather than returning null', () => {
    const {
      matcher: _m,
      group_by: _g,
      grouping_mode: _gm,
      throttle: _t,
      ...withoutOptionals
    } = validResponse;

    const result = actionPolicyResponseSchema.parse(withoutOptionals);

    expect(result).toEqual(withoutOptionals);
    for (const key of ['matcher', 'group_by', 'grouping_mode', 'throttle', 'snoozed_until']) {
      expect(result).not.toHaveProperty(key);
    }
  });

  it.each(['matcher', 'group_by', 'grouping_mode', 'throttle', 'snoozed_until'] as const)(
    'rejects %s set to null — unset is absent on a read',
    (field) => {
      expect(
        actionPolicyResponseSchema.safeParse({ ...validResponse, [field]: null }).success
      ).toBe(false);
    }
  );

  it('rejects a null throttle strategy or interval', () => {
    expect(
      actionPolicyResponseSchema.safeParse({ ...validResponse, throttle: { strategy: null } })
        .success
    ).toBe(false);
    expect(
      actionPolicyResponseSchema.safeParse({
        ...validResponse,
        throttle: { strategy: 'time_interval', interval: null },
      }).success
    ).toBe(false);
  });

  it('still carries the actors as null — they are decided with the actor reshape', () => {
    const result = actionPolicyResponseSchema.parse({
      ...validResponse,
      created_by: null,
      updated_by: null,
    });
    expect(result.created_by).toBeNull();
    expect(result.updated_by).toBeNull();
  });

  it('round-trips: what a read returns, minus the server-managed fields, is a valid create body', () => {
    const {
      id: _id,
      enabled: _enabled,
      snoozed_until: _snoozedUntil,
      created_by: _createdBy,
      created_at: _createdAt,
      updated_by: _updatedBy,
      updated_at: _updatedAt,
      ...writable
    } = actionPolicyResponseSchema.parse({
      ...validResponse,
      snoozed_until: '2026-02-01T00:00:00.000Z',
    });

    expect(createActionPolicyDataSchema.safeParse(writable).success).toBe(true);
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
