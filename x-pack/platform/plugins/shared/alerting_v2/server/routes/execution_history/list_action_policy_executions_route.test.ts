/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toListExecutionHistoryArgs } from './list_action_policy_executions_route';

describe('toListExecutionHistoryArgs', () => {
  it('maps the snake_case request to camelCase client args (without request)', () => {
    expect(
      toListExecutionHistoryArgs({
        page: 1,
        per_page: 100,
        search: 'foo',
        rule_ids: ['rule-1', 'rule-2'],
        outcomes: ['success'],
        alert_ids: ['ep-1'],
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        sort_field: 'dispatched_at',
        sort_order: 'asc',
      })
    ).toEqual({
      page: 1,
      perPage: 100,
      search: 'foo',
      ruleIds: ['rule-1', 'rule-2'],
      outcomes: ['success'],
      alertIds: ['ep-1'],
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      sortField: 'dispatched_at',
      sortOrder: 'asc',
    });
  });
});
