/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleEventsEsqlQuery } from './rule_events_query';

describe('buildRuleEventsEsqlQuery', () => {
  it('scopes to rule id, time window, sorts descending and limits', () => {
    const queryString = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
    }).print('basic');

    expect(queryString).toContain('rule.id');
    expect(queryString).toContain('rule-abc');
    expect(queryString).toContain('2026-04-01T00:00:00.000Z');
    expect(queryString).toContain('2026-04-08T00:00:00.000Z');
    expect(queryString).toContain('SORT @timestamp DESC');
    expect(queryString).toContain('LIMIT 5000');
    expect(queryString).toContain('episode.status');
    expect(queryString).toContain('group_hash');
  });
});
