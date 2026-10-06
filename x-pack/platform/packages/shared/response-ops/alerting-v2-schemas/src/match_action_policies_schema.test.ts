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
  const emptyResponse = { items: [], evaluated_count: 0, is_truncated: false };

  it.each([
    emptyResponse,
    { items: [], evaluated_count: 3, is_truncated: false },
    { items: [], evaluated_count: 100, is_truncated: true },
  ])('accepts a response with an empty list and evaluation metadata: %j', (response) => {
    expect(matchActionPoliciesResponseSchema.parse(response)).toEqual(response);
  });

  it.each(['evaluated_count', 'is_truncated'])('requires %s', (field) => {
    expect(() =>
      matchActionPoliciesResponseSchema.parse({ ...emptyResponse, [field]: undefined })
    ).toThrow();
  });

  it.each([{ evaluated_count: -1 }, { evaluated_count: 1.5 }, { is_truncated: 'true' }])(
    'rejects invalid evaluation metadata: %j',
    (invalidFields) => {
      expect(() =>
        matchActionPoliciesResponseSchema.parse({ ...emptyResponse, ...invalidFields })
      ).toThrow();
    }
  );
});
