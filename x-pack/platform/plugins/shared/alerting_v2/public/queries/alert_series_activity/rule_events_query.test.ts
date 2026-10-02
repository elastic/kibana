/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleEventsQuery } from './rule_events_query';

const RULE_ID = 'rule-abc';
const WINDOW_START_MS = Date.parse('2026-04-01T00:00:00Z');
const WINDOW_END_MS = Date.parse('2026-04-08T00:00:00Z');

describe('buildRuleEventsQuery', () => {
  const queryString = buildRuleEventsQuery({
    ruleId: RULE_ID,
    windowEndMs: WINDOW_END_MS,
    episodeIds: ['ep-1', 'ep-2'],
  }).print('basic');

  it('fetches the selected episodes through the window end', () => {
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain(RULE_ID);
    expect(queryString).not.toContain(new Date(WINDOW_START_MS).toISOString());
    expect(queryString).toContain('2026-04-08T00:00:00.000Z');
    expect(queryString).toContain('episode.id IN');
    expect(queryString).toContain('ep-1');
    expect(queryString).toContain('ep-2');
  });

  it('returns every raw event oldest first without aggregating repeated statuses', () => {
    expect(queryString).not.toContain('STATS');
    expect(queryString).toContain('SORT @timestamp ASC');
  });

  it('does not apply a result limit', () => {
    expect(queryString).not.toContain('LIMIT');
  });

  it('keeps the event columns', () => {
    expect(queryString).toContain('KEEP @timestamp, `episode.id`, `episode.status`, group_hash');
  });
});
