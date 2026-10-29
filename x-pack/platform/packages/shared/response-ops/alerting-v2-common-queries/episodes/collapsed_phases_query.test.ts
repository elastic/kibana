/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCollapsedStatusPhasesQuery,
  buildCollapsedSeverityPhasesQuery,
} from './collapsed_phases_query';

const RULE_ID = 'rule-abc';
const WINDOW_START_MS = Date.parse('2026-04-01T00:00:00Z');
const WINDOW_END_MS = Date.parse('2026-04-08T00:00:00Z');

describe('buildCollapsedStatusPhasesQuery', () => {
  const queryString = buildCollapsedStatusPhasesQuery({
    ruleId: RULE_ID,
    window: { startMs: WINDOW_START_MS, endMs: WINDOW_END_MS },
    alertIds: ['ep-1', 'ep-2'],
  }).print('basic');

  it('scopes to alert type, rule, lookback window and the given episodes', () => {
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain(RULE_ID);
    expect(queryString).toContain('2026-04-01T00:00:00.000Z');
    expect(queryString).toContain('2026-04-08T00:00:00.000Z');
    expect(queryString).toContain('episode.id IN');
    expect(queryString).toContain('ep-1');
    expect(queryString).toContain('ep-2');
  });

  it('aggregates start/end and event count per episode status phase', () => {
    expect(queryString).toContain('seg_start = MIN(@timestamp)');
    expect(queryString).toContain('seg_end = MAX(@timestamp)');
    expect(queryString).toContain('event_count = COUNT(*)');
    expect(queryString).toContain('BY episode.id, episode.status, group_hash');
  });

  it('applies an explicit ceiling sized to phases × episodes', () => {
    // 2 episodes × 4 statuses.
    expect(queryString).toContain('LIMIT 8');
  });

  it('keeps the phase columns', () => {
    expect(queryString).toContain(
      'KEEP `episode.id`, `episode.status`, group_hash, seg_start, seg_end, event_count'
    );
  });

  it('omits the time filter when no window is given', () => {
    const untimed = buildCollapsedStatusPhasesQuery({ ruleId: RULE_ID, alertIds: ['ep-1'] }).print(
      'basic'
    );
    expect(untimed).not.toContain('@timestamp >=');
    expect(untimed).toContain('LIMIT 4');
  });

  it('does not filter by space unless a space is given', () => {
    expect(queryString).not.toContain('space_id');
  });

  it('scopes to the space and omits the rule filter for an alert without a rule', () => {
    const external = buildCollapsedStatusPhasesQuery({
      spaceId: 'space-1',
      alertIds: ['ep-1'],
    }).print('basic');
    expect(external).toContain('space_id == "space-1"');
    expect(external).not.toContain('rule.id');
    expect(external).toContain('episode.id IN ("ep-1")');
  });
});

describe('buildCollapsedSeverityPhasesQuery', () => {
  const queryString = buildCollapsedSeverityPhasesQuery({
    ruleId: RULE_ID,
    alertIds: ['ep-1'],
  }).print('basic');

  it('scopes to alert type, rule and the given episodes without a time filter', () => {
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain(RULE_ID);
    expect(queryString).toContain('episode.id IN');
    expect(queryString).not.toContain('@timestamp >=');
  });

  it('aggregates start/end and event count per severity', () => {
    expect(queryString).toContain(
      'seg_start = MIN(@timestamp), seg_end = MAX(@timestamp), event_count = COUNT(*)'
    );
    expect(queryString).toContain('BY episode.id, severity');
    expect(queryString).toContain('KEEP `episode.id`, severity, seg_start, seg_end, event_count');
  });

  it('scopes to the space and omits the rule filter for an alert without a rule', () => {
    const external = buildCollapsedSeverityPhasesQuery({
      spaceId: 'space-1',
      alertIds: ['ep-1'],
    }).print('basic');
    expect(external).toContain('space_id == "space-1"');
    expect(external).not.toContain('rule.id');
  });
});
