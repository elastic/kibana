/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodesKpisQuery, buildEpisodesHistogramQuery } from './episodes_query';

describe('buildEpisodesKpisQuery', () => {
  const SPACE = 'default';
  const UID = 'user-abc-123';

  it('produces a STATS command with all six KPI aggregations', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain('STATS');
    expect(output).toContain('alerts_count');
    expect(output).toContain('firing_rules');
    expect(output).toContain('assigned_to_me');
    expect(output).toContain('unassigned');
    expect(output).toContain('acknowledged');
    expect(output).toContain('snoozed');
  });

  it('uses COUNT(*) for alerts_count to capture all matching episodes', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toMatch(/alerts_count\s*=\s*COUNT\(\*\)/);
  });

  it('uses COUNT_DISTINCT over a nullable rule.id column for firing_rules', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toMatch(/COUNT_DISTINCT\(_active_rule_id\)/);
  });

  it('embeds the currentUserUid in the assigned_to_me EVAL', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain(UID);
    expect(output).toMatch(/SUM\(_assigned_to_me\)/);
  });

  it('sets assigned_to_me to a constant 0 when no currentUserUid is provided', () => {
    const output = buildEpisodesKpisQuery(SPACE, undefined);
    expect(output).toContain('EVAL _assigned_to_me = 0');
    expect(output).not.toContain('last_assignee_uid ==');
    expect(output).toMatch(/SUM\(_assigned_to_me\)/);
  });

  it('uses IS NULL check for unassigned', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain('last_assignee_uid IS NULL');
  });

  it('checks last_ack_action for acknowledged', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain('last_ack_action == "ack"');
  });

  it('counts indefinitely snoozed episodes (snooze_expiry IS NULL) as snoozed', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain('last_snooze_action == "snooze"');
    expect(output).toContain('snooze_expiry IS NULL');
  });

  it('excludes expired snoozes (snooze_expiry in the past) from the snoozed count', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output).toContain('TO_DATETIME(snooze_expiry) > NOW()');
  });

  it('applies queryString filter when provided', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID, { queryString: 'alert.name: "cpu"' });
    expect(output).toContain('QSTR(');
  });

  it('does not include SORT or LIMIT', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID);
    expect(output.toUpperCase()).not.toContain('SORT');
    expect(output.toUpperCase()).not.toContain('LIMIT');
  });

  it('applies status filter when provided', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID, { status: ['active'] });
    expect(output).toMatch(/\| WHERE `episode\.status` == "active"/);
  });

  it('applies ruleId filter when provided', () => {
    const output = buildEpisodesKpisQuery(SPACE, UID, { ruleId: 'rule-xyz' });
    expect(output).toContain('WHERE rule.id == "rule-xyz"');
  });
});

describe('buildEpisodesHistogramQuery', () => {
  it('includes first_timestamp, last_timestamp, and episode.status in KEEP', () => {
    const output = buildEpisodesHistogramQuery('default').print('basic');
    expect(output).toMatch(/first_timestamp/);
    expect(output).toMatch(/last_timestamp/);
    expect(output).toMatch(/episode\.status/);
  });

  it('includes LIMIT 10000', () => {
    const output = buildEpisodesHistogramQuery('default').print('basic');
    expect(output).toContain('10000');
  });

  it('does not include a SORT command', () => {
    const output = buildEpisodesHistogramQuery('default').print('basic');
    expect(output.toUpperCase()).not.toContain('SORT');
  });

  it('includes the breakdown field in the output when provided', () => {
    const output = buildEpisodesHistogramQuery('default', undefined, 'rule.id').print('basic');
    expect(output).toMatch(/rule\.id/);
  });

  it('includes the status filter when filterState.status is provided', () => {
    const output = buildEpisodesHistogramQuery('default', { status: ['active'] }).print('basic');
    expect(output).toMatch(/\| WHERE `episode\.status` == "active"/);
  });

  it('includes the ruleId filter when filterState.ruleId is provided', () => {
    const output = buildEpisodesHistogramQuery('default', { ruleId: 'rule-abc' }).print('basic');
    expect(output).toContain('rule-abc');
  });

  it('includes the tags filter when filterState.tags is provided', () => {
    const output = buildEpisodesHistogramQuery('default', { tags: ['critical', 'prod'] }).print(
      'basic'
    );
    expect(output).toMatch(/critical/);
    expect(output).toMatch(/prod/);
  });

  it('includes the assigneeUid filter when filterState.assigneeUid is provided', () => {
    const output = buildEpisodesHistogramQuery('default', { assigneeUid: 'user-xyz' }).print(
      'basic'
    );
    expect(output).toContain('user-xyz');
  });
});
