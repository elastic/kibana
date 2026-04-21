/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertSummaryQuery } from './build_alert_summary_query';

describe('buildAlertSummaryQuery', () => {
  const baseOpts = {
    gte: '2026-01-01T00:00:00.000Z',
    lte: '2026-01-31T23:59:59.999Z',
    fixedInterval: '1 day',
    ruleIds: ['rule-a'],
    spaceId: 'default',
  };

  it('targets the .rule-events data stream', () => {
    const { query } = buildAlertSummaryQuery(baseOpts);
    expect(query).toContain('FROM .rule-events');
  });

  it('filters by alert event type, space and time range', () => {
    const { query } = buildAlertSummaryQuery(baseOpts);
    expect(query).toContain('WHERE type == "alert"');
    expect(query).toContain('space_id == ?space_id');
    expect(query).toContain('@timestamp >= ?_tstart::DATETIME');
    expect(query).toContain('@timestamp <= ?_tend::DATETIME');
  });

  it('emits a single IN placeholder when exactly one rule id is provided', () => {
    const { query, params } = buildAlertSummaryQuery({ ...baseOpts, ruleIds: ['rule-a'] });
    expect(query).toContain('`rule.id` IN (?rule_id_0)');
    expect(params).toEqual([
      { _tstart: baseOpts.gte },
      { _tend: baseOpts.lte },
      { space_id: baseOpts.spaceId },
      { rule_id_0: 'rule-a' },
    ]);
  });

  it('emits one placeholder per rule id, preserving input order', () => {
    const ruleIds = ['rule-a', 'rule-b', 'rule-c'];
    const { query, params } = buildAlertSummaryQuery({ ...baseOpts, ruleIds });

    expect(query).toContain('`rule.id` IN (?rule_id_0, ?rule_id_1, ?rule_id_2)');
    expect(params).toEqual([
      { _tstart: baseOpts.gte },
      { _tend: baseOpts.lte },
      { space_id: baseOpts.spaceId },
      { rule_id_0: 'rule-a' },
      { rule_id_1: 'rule-b' },
      { rule_id_2: 'rule-c' },
    ]);
  });

  it('splits active and recovered counts via STATS .. WHERE', () => {
    const { query } = buildAlertSummaryQuery(baseOpts);
    expect(query).toContain('active_events    = COUNT(*) WHERE status == "breached"');
    expect(query).toContain('recovered_events = COUNT(*) WHERE status == "recovered"');
  });

  it('buckets by @timestamp using the requested fixed interval', () => {
    const { query } = buildAlertSummaryQuery({ ...baseOpts, fixedInterval: '30 minutes' });
    expect(query).toContain('BY bucket = BUCKET(@timestamp, 30 minutes)');
    expect(query).toContain('SORT bucket ASC');
    expect(query).not.toMatch(/^\s*\| EVAL bucket/m);
  });

  it('trims surrounding whitespace from fixedInterval before inlining', () => {
    const { query } = buildAlertSummaryQuery({ ...baseOpts, fixedInterval: '  1 hour  ' });
    expect(query).toContain('BUCKET(@timestamp, 1 hour)');
  });

  it('rejects fixedInterval values outside the safe character set', () => {
    expect(() => buildAlertSummaryQuery({ ...baseOpts, fixedInterval: '1 hour | DROP *' })).toThrow(
      /fixedInterval/
    );
    expect(() => buildAlertSummaryQuery({ ...baseOpts, fixedInterval: '1" OR "1"="1' })).toThrow(
      /fixedInterval/
    );
  });

  it('throws when called with no rule ids', () => {
    expect(() => buildAlertSummaryQuery({ ...baseOpts, ruleIds: [] })).toThrow(/ruleIds/);
  });
});
