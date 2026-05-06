/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTopNSeriesQuery } from './top_n_series_query';

const RULE_ID = 'rule-abc';
const GTE_MS = Date.parse('2026-04-01T00:00:00Z');
const LTE_MS = Date.parse('2026-04-08T00:00:00Z');

describe('buildTopNSeriesQuery', () => {
  const queryString = buildTopNSeriesQuery({
    ruleId: RULE_ID,
    gteMs: GTE_MS,
    lteMs: LTE_MS,
  }).print('basic');

  it('scopes to alert type and the given rule id', () => {
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('rule.id');
    expect(queryString).toContain(RULE_ID);
  });

  it('scopes to the given time window', () => {
    expect(queryString).toContain('2026-04-01T00:00:00.000Z');
    expect(queryString).toContain('2026-04-08T00:00:00.000Z');
  });

  it('aggregates by group_hash with MAX(@timestamp)', () => {
    expect(queryString).toContain('last_event_ts = MAX(@timestamp)');
    expect(queryString).toContain('BY group_hash');
  });

  it('sorts by most recent activity descending', () => {
    expect(queryString).toContain('SORT last_event_ts DESC');
  });

  it('applies a high limit to capture all series', () => {
    expect(queryString).toContain('LIMIT 10000');
  });

  it('keeps only group_hash in the output', () => {
    expect(queryString).toContain('KEEP group_hash');
  });
});
