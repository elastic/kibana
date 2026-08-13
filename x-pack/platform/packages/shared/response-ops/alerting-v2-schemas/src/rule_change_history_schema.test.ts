/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE,
  RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW,
} from './constants';
import {
  getRuleChangeHistoryEventParamsSchema,
  listRuleChangeHistoryRequestSchema,
  listRuleChangeHistoryResponseSchema,
  ruleChangeHistoryDetailSchema,
} from './rule_change_history_schema';

describe('listRuleChangeHistoryRequestSchema', () => {
  it('applies defaults for page and per_page', () => {
    expect(listRuleChangeHistoryRequestSchema.parse({})).toEqual({
      page: 1,
      per_page: RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE,
    });
  });

  it('coerces numeric query strings', () => {
    expect(listRuleChangeHistoryRequestSchema.parse({ page: '2', per_page: '10' })).toEqual({
      page: 2,
      per_page: 10,
    });
  });

  it('rejects pages that exceed the max result window', () => {
    const result = listRuleChangeHistoryRequestSchema.safeParse({
      page: RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW / 20 + 1,
      per_page: 20,
    });
    expect(result.success).toBe(false);
  });
});

describe('getRuleChangeHistoryEventParamsSchema', () => {
  it('requires both id and eventId', () => {
    expect(
      getRuleChangeHistoryEventParamsSchema.parse({ id: 'rule-1', eventId: 'event-1' })
    ).toEqual({ id: 'rule-1', eventId: 'event-1' });
    expect(getRuleChangeHistoryEventParamsSchema.safeParse({ id: 'rule-1' }).success).toBe(false);
  });
});

describe('listRuleChangeHistoryResponseSchema', () => {
  it('accepts lean list rows without a snapshot', () => {
    expect(
      listRuleChangeHistoryResponseSchema.safeParse({
        items: [
          {
            id: 'event-1',
            timestamp: '2026-01-15T12:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_create',
            isCurrent: true,
            metadata: { version: 1 },
          },
        ],
        total: 1,
      }).success
    ).toBe(true);
  });
});

describe('ruleChangeHistoryDetailSchema', () => {
  it('accepts a permissive snapshot payload', () => {
    expect(
      ruleChangeHistoryDetailSchema.safeParse({
        id: 'event-1',
        timestamp: '2026-01-15T12:00:00.000Z',
        actor: { name: 'elastic', profileId: 'u_1' },
        action: 'rule_update',
        changes: { count: 1, summary: { metadata: { name: 'old' } } },
        snapshot: { id: 'rule-1', unexpected_legacy_field: true },
      }).success
    ).toBe(true);
  });

  it('rejects detail payloads missing a snapshot', () => {
    expect(
      ruleChangeHistoryDetailSchema.safeParse({
        id: 'event-1',
        timestamp: '2026-01-15T12:00:00.000Z',
        actor: { name: 'elastic' },
        action: 'rule_create',
      }).success
    ).toBe(false);
  });
});
