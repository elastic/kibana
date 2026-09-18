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
      rule: { tags: ['cpu'] },
    });

    expect(result).toEqual({
      rule: { tags: ['cpu'] },
    });
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      matchActionPoliciesForRuleBodySchema.parse({
        rule: { tags: ['cpu'] },
        unknownField: 'x',
      })
    ).toThrow();
  });

  it('rejects rule id and name (strict, no longer supported)', () => {
    expect(() =>
      matchActionPoliciesForRuleBodySchema.parse({
        rule: { id: 'rule-1', name: 'my-rule', tags: ['cpu'] },
      })
    ).toThrow();
  });

  it('rejects unknown keys inside rule (strict)', () => {
    expect(() =>
      matchActionPoliciesForRuleBodySchema.parse({
        rule: { unknownField: 'x' },
      })
    ).toThrow();
  });
});

describe('matchActionPoliciesForRuleResponseSchema', () => {
  const emptyResponse = { items: [], total: 0, evaluated_count: 0, is_truncated: false };

  it.each([
    emptyResponse,
    { items: [], total: 3, evaluated_count: 3, is_truncated: false },
    { items: [], total: 250, evaluated_count: 100, is_truncated: true },
  ])('accepts a response with an empty list and evaluation metadata: %j', (response) => {
    expect(matchActionPoliciesForRuleResponseSchema.parse(response)).toEqual(response);
  });

  it.each(['total', 'evaluated_count', 'is_truncated'])('requires %s', (field) => {
    expect(() =>
      matchActionPoliciesForRuleResponseSchema.parse({ ...emptyResponse, [field]: undefined })
    ).toThrow();
  });

  it.each([
    { total: -1 },
    { evaluated_count: -1 },
    { evaluated_count: 1.5 },
    { is_truncated: 'true' },
  ])('rejects invalid evaluation metadata: %j', (invalidFields) => {
    expect(() =>
      matchActionPoliciesForRuleResponseSchema.parse({ ...emptyResponse, ...invalidFields })
    ).toThrow();
  });
});
