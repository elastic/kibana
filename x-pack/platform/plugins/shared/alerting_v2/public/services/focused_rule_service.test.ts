/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleApiResponse } from './rules_api';
import { FocusedRuleService } from './focused_rule_service';

const createRule = (id: string): RuleApiResponse =>
  ({
    id,
    kind: 'signal',
    enabled: true,
    metadata: { name: `Rule ${id}`, version: 1 },
    time_field: '@timestamp',
    schedule: { every: '5m' },
    query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
    created_by: 'alice',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'alice',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as RuleApiResponse);

describe('FocusedRuleService', () => {
  it('stores and clears the focused rule', () => {
    const service = new FocusedRuleService();
    const rule = createRule('rule-1');

    service.setFocusedRule(rule);

    expect(service.getFocusedRule()).toBe(rule);

    service.clearFocusedRule('rule-1');

    expect(service.getFocusedRule()).toBeUndefined();
  });

  it('does not clear a newer focused rule with an older rule id', () => {
    const service = new FocusedRuleService();
    const firstRule = createRule('rule-1');
    const secondRule = createRule('rule-2');

    service.setFocusedRule(firstRule);
    service.setFocusedRule(secondRule);
    service.clearFocusedRule('rule-1');

    expect(service.getFocusedRule()).toBe(secondRule);
  });
});
