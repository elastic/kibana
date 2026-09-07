/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListRuleExecutionsResult } from '../../lib/execution_history_client';
import {
  toListRuleExecutionsArgs,
  toListRuleExecutionsResponse,
} from './list_rule_executions_route';

describe('toListRuleExecutionsArgs', () => {
  it('maps the snake_case request to camelCase client args and translates the sort value', () => {
    expect(
      toListRuleExecutionsArgs({
        rule_ids: ['rule-1'],
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

describe('toListRuleExecutionsResponse', () => {
  const item: ListRuleExecutionsResult['items'][number] = {
    id: 'exec-1',
    rule: { id: 'rule-1', version: 3 },
    spaceId: 'default',
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.500Z',
    timings: { duration: 1500, scheduledDelay: 250 },
    outcome: 'success',
    reason: null,
    error: null,
  };

  it('maps the camelCase client result onto the snake_case response body', () => {
    expect(toListRuleExecutionsResponse({ items: [item], total: 1, page: 2, perPage: 25 })).toEqual(
      {
        items: [
          {
            id: 'exec-1',
            rule: { id: 'rule-1', version: 3 },
            space_id: 'default',
            started_at: '2026-01-01T00:00:00.000Z',
            ended_at: '2026-01-01T00:00:01.500Z',
            timings: { duration: 1500, scheduled_delay: 250 },
            outcome: 'success',
            reason: null,
            error: null,
          },
        ],
        total: 1,
        page: 2,
        per_page: 25,
      }
    );
  });

  it('maps the nested error stack trace and keeps a null error null', () => {
    const [mapped] = toListRuleExecutionsResponse({
      items: [{ ...item, outcome: 'failure', error: { message: 'boom', stackTrace: 'at x' } }],
      total: 1,
      page: 1,
      perPage: 10,
    }).items;

    expect(mapped.error).toEqual({ message: 'boom', stack_trace: 'at x' });
  });

  it('returns an empty items array untouched', () => {
    expect(toListRuleExecutionsResponse({ items: [], total: 0, page: 1, perPage: 10 })).toEqual({
      items: [],
      total: 0,
      page: 1,
      per_page: 10,
    });
  });
});
