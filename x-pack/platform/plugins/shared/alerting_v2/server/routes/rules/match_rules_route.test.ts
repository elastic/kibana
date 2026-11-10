/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindMatchingRulesArgs } from './match_rules_route';

describe('toFindMatchingRulesArgs', () => {
  it('maps the snake_case body to camelCase client args', () => {
    expect(
      toFindMatchingRulesArgs({
        matcher: { tags: ['prod'], expression: 'severity: critical' },
        page: 2,
        per_page: 50,
      })
    ).toEqual({
      matcher: { tags: ['prod'], expression: 'severity: critical' },
      page: 2,
      perPage: 50,
    });
  });
});
