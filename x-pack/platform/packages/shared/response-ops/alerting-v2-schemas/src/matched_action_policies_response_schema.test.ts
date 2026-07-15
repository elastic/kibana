/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchActionPoliciesForRuleBodySchema } from './matched_action_policies_response_schema';

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
