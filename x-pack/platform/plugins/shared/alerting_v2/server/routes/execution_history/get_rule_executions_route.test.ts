/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toGetRuleExecutionsArgs } from './get_rule_executions_route';

describe('toGetRuleExecutionsArgs', () => {
  it('maps the snake_case request to camelCase client args and translates the sort value', () => {
    expect(
      toGetRuleExecutionsArgs({
        rule_id: ['rule-1'],
        outcome: ['success'],
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        sort: 'started_at',
        sort_order: 'asc',
        page: 2,
        per_page: 25,
      })
    ).toEqual({
      ruleIds: ['rule-1'],
      outcomes: ['success'],
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      sort: 'startedAt',
      sortOrder: 'asc',
      page: 2,
      perPage: 25,
    });
  });
});
