/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIND_DEFAULT_PER_PAGE, FIND_MAX_RESULT_WINDOW, MAX_PER_PAGE } from './constants';
import { matchRulesBodySchema } from './match_rules_schema';
import { POLICY_MATCHER_TAGS_MAX } from './policy_matcher_schema';

describe('matchRulesBodySchema', () => {
  it('accepts an empty body', () => {
    expect(matchRulesBodySchema.parse({})).toEqual({});
  });

  it('accepts a null matcher', () => {
    expect(matchRulesBodySchema.parse({ matcher: null })).toEqual({ matcher: null });
  });

  it('accepts a matcher with tags and an expression along with pagination', () => {
    const body = {
      matcher: { tags: ['cpu', 'prod'], expression: 'data.host.name: "host-1"' },
      page: 2,
      per_page: 50,
    };

    expect(matchRulesBodySchema.parse(body)).toEqual(body);
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(matchRulesBodySchema.safeParse({ policy_id: 'policy-1' }).success).toBe(false);
  });

  it(`rejects more than ${POLICY_MATCHER_TAGS_MAX} matcher tags`, () => {
    const tags = Array.from({ length: POLICY_MATCHER_TAGS_MAX + 1 }, (_, index) => `tag-${index}`);

    expect(matchRulesBodySchema.safeParse({ matcher: { tags } }).success).toBe(false);
  });

  it.each([0, -1, 1.5, '2', FIND_MAX_RESULT_WINDOW + 1])('rejects page %p', (page) => {
    expect(matchRulesBodySchema.safeParse({ page }).success).toBe(false);
  });

  it.each([0, -1, 1.5, '10', MAX_PER_PAGE + 1])('rejects per_page %p', (perPage) => {
    expect(matchRulesBodySchema.safeParse({ per_page: perPage }).success).toBe(false);
  });

  it('rejects pages beyond the result window', () => {
    const lastPage = FIND_MAX_RESULT_WINDOW / MAX_PER_PAGE;

    expect(matchRulesBodySchema.safeParse({ page: lastPage, per_page: MAX_PER_PAGE }).success).toBe(
      true
    );
    expect(
      matchRulesBodySchema.safeParse({ page: lastPage + 1, per_page: MAX_PER_PAGE }).success
    ).toBe(false);
  });

  it('uses the default per_page for the result window check', () => {
    const lastPage = FIND_MAX_RESULT_WINDOW / FIND_DEFAULT_PER_PAGE;

    expect(matchRulesBodySchema.safeParse({ page: lastPage }).success).toBe(true);
    expect(matchRulesBodySchema.safeParse({ page: lastPage + 1 }).success).toBe(false);
  });
});
