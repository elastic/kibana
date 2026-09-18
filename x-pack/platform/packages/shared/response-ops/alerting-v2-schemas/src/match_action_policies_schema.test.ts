/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  matchActionPoliciesBodySchema,
  matchActionPoliciesResponseSchema,
} from './match_action_policies_schema';

describe('matchActionPoliciesBodySchema', () => {
  it('accepts a valid rule payload', () => {
    const result = matchActionPoliciesBodySchema.parse({
      rule: { tags: ['cpu'] },
    });

    expect(result).toEqual({
      rule: { tags: ['cpu'] },
    });
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      matchActionPoliciesBodySchema.parse({
        rule: { tags: ['cpu'] },
        unknownField: 'x',
      })
    ).toThrow();
  });

  it('rejects rule id and name (strict, no longer supported)', () => {
    expect(() =>
      matchActionPoliciesBodySchema.parse({
        rule: { id: 'rule-1', name: 'my-rule', tags: ['cpu'] },
      })
    ).toThrow();
  });

  it('rejects unknown keys inside rule (strict)', () => {
    expect(() =>
      matchActionPoliciesBodySchema.parse({
        rule: { unknownField: 'x' },
      })
    ).toThrow();
  });
});

describe('matchActionPoliciesResponseSchema', () => {
  it('accepts a response with an empty item list and a total', () => {
    const result = matchActionPoliciesResponseSchema.parse({ items: [], total: 0 });

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('rejects a response missing total', () => {
    expect(() => matchActionPoliciesResponseSchema.parse({ items: [] })).toThrow();
  });

  it('rejects a negative total', () => {
    expect(() => matchActionPoliciesResponseSchema.parse({ items: [], total: -1 })).toThrow();
  });
});
