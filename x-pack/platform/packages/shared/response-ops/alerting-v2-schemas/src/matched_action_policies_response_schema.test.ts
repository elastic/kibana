/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  matchActionPoliciesForRuleBodySchema,
  matchActionPoliciesForRuleResponseSchema,
} from './matched_action_policies_response_schema';

describe('matchActionPoliciesForRuleBodySchema', () => {
  it('accepts a valid rule payload', () => {
    const result = matchActionPoliciesForRuleBodySchema.parse({
      rule: { id: 'rule-1', name: 'my-rule', tags: ['cpu'] },
    });

    expect(result).toEqual({
      rule: { id: 'rule-1', name: 'my-rule', tags: ['cpu'] },
    });
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      matchActionPoliciesForRuleBodySchema.parse({
        rule: { id: 'rule-1' },
        unknownField: 'x',
      })
    ).toThrow();
  });

  it('rejects unknown keys inside rule (strict)', () => {
    expect(() =>
      matchActionPoliciesForRuleBodySchema.parse({
        rule: { id: 'rule-1', unknownField: 'x' },
      })
    ).toThrow();
  });
});

describe('matchActionPoliciesForRuleResponseSchema', () => {
  it('accepts a response with an empty item list and a total', () => {
    const result = matchActionPoliciesForRuleResponseSchema.parse({ items: [], total: 0 });

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('rejects a response missing total', () => {
    expect(() => matchActionPoliciesForRuleResponseSchema.parse({ items: [] })).toThrow();
  });

  it('rejects a negative total', () => {
    expect(() =>
      matchActionPoliciesForRuleResponseSchema.parse({ items: [], total: -1 })
    ).toThrow();
  });
});
