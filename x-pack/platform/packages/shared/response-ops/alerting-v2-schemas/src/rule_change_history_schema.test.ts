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
  getRuleChangeHistoryEventQuerySchema,
  listRuleChangeHistoryRequestSchema,
  listRuleChangeHistoryResponseSchema,
  ruleChangeHistoryDetailSchema,
} from './rule_change_history_schema';

describe('listRuleChangeHistoryRequestSchema', () => {
  it('applies defaults for page and per_page', () => {
    expect(listRuleChangeHistoryRequestSchema.parse({ rule_id: 'rule-1' })).toEqual({
      rule_id: 'rule-1',
      page: 1,
      per_page: RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE,
    });
  });

  it('requires rule_id', () => {
    expect(listRuleChangeHistoryRequestSchema.safeParse({ page: 1 }).success).toBe(false);
  });

  it('coerces numeric query strings', () => {
    expect(
      listRuleChangeHistoryRequestSchema.parse({ rule_id: 'rule-1', page: '2', per_page: '10' })
    ).toEqual({ rule_id: 'rule-1', page: 2, per_page: 10 });
  });

  it('rejects pages that exceed the max result window', () => {
    const result = listRuleChangeHistoryRequestSchema.safeParse({
      rule_id: 'rule-1',
      page: RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW / 20 + 1,
      per_page: 20,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(
      listRuleChangeHistoryRequestSchema.safeParse({ rule_id: 'rule-1', unknown_field: 'x' })
        .success
    ).toBe(false);
  });
});

describe('getRuleChangeHistoryEventParamsSchema', () => {
  it('requires change_id', () => {
    expect(getRuleChangeHistoryEventParamsSchema.parse({ change_id: 'event-1' })).toEqual({
      change_id: 'event-1',
    });
    expect(getRuleChangeHistoryEventParamsSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(
      getRuleChangeHistoryEventParamsSchema.safeParse({
        change_id: 'event-1',
        foo: 'bar',
      }).success
    ).toBe(false);
  });
});

describe('getRuleChangeHistoryEventQuerySchema', () => {
  it('requires rule_id and rejects unknown keys', () => {
    expect(getRuleChangeHistoryEventQuerySchema.parse({ rule_id: 'rule-1' })).toEqual({
      rule_id: 'rule-1',
    });
    expect(getRuleChangeHistoryEventQuerySchema.safeParse({}).success).toBe(false);
    expect(
      getRuleChangeHistoryEventQuerySchema.safeParse({ rule_id: 'rule-1', foo: 'bar' }).success
    ).toBe(false);
  });
});

describe('listRuleChangeHistoryResponseSchema', () => {
  it('accepts lean list rows without a snapshot', () => {
    expect(
      listRuleChangeHistoryResponseSchema.safeParse({
        items: [
          {
            id: 'event-1',
            created_at: '2026-01-15T12:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_create',
            is_current: true,
            version: 1,
          },
        ],
        total: 1,
      }).success
    ).toBe(true);
  });

  it('rejects an action outside the recorded lifecycle vocabulary', () => {
    expect(
      listRuleChangeHistoryResponseSchema.safeParse({
        items: [
          {
            id: 'event-1',
            created_at: '2026-01-15T12:00:00.000Z',
            actor: { name: 'elastic' },
            action: 'rule_archive',
          },
        ],
        total: 1,
      }).success
    ).toBe(false);
  });
});

describe('ruleChangeHistoryDetailSchema', () => {
  it('accepts a permissive snapshot payload', () => {
    expect(
      ruleChangeHistoryDetailSchema.safeParse({
        id: 'event-1',
        created_at: '2026-01-15T12:00:00.000Z',
        actor: { name: 'elastic', profile_id: 'u_1' },
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
        created_at: '2026-01-15T12:00:00.000Z',
        actor: { name: 'elastic' },
        action: 'rule_create',
      }).success
    ).toBe(false);
  });
});
