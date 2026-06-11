/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleEventsEsqlQuery, PER_EPISODE_EVENT_LIMIT } from './rule_events_query';

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

  it('caps events per episode before the global ceiling', () => {
    const queryString = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
    }).print('basic');

    // Per-episode cap is inlined as a literal integer (not a bound param).
    expect(queryString).toContain(`LIMIT ${PER_EPISODE_EVENT_LIMIT} BY episode.id`);

    // The per-episode LIMIT ... BY must precede the global ceiling so each
    // episode keeps its most-recent events before the overall cap is applied.
    expect(queryString.indexOf(`LIMIT ${PER_EPISODE_EVENT_LIMIT} BY episode.id`)).toBeLessThan(
      queryString.indexOf('LIMIT 5000')
    );
  });

  it('threads an explicit per-episode limit through', () => {
    const queryString = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
      perEpisodeLimit: 123,
    }).print('basic');

    expect(queryString).toContain('LIMIT 123 BY episode.id');
  });

  it('scopes to the provided group hashes', () => {
    const queryString = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
      groupHashes: ['hash-1', 'hash-2'],
    }).print('basic');

    expect(queryString).toContain('group_hash IN');
    expect(queryString).toContain('hash-1');
    expect(queryString).toContain('hash-2');
  });

  it('omits the group hash filter when no hashes are provided', () => {
    const withoutHashes = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
    }).print('basic');

    const withEmptyHashes = buildRuleEventsEsqlQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      pageSize: 5000,
      groupHashes: [],
    }).print('basic');

    expect(withoutHashes).not.toContain('group_hash IN');
    expect(withEmptyHashes).not.toContain('group_hash IN');
  });
});
