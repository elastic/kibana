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
    expect(query).toContain('FROM ".rule-events"');
  });

  it('filters by alert event type and binds scalar runtime values as named params', () => {
    const { query, params } = buildAlertSummaryQuery(baseOpts);
    expect(query).toContain('type == "alert"');
    expect(query).toContain('space_id == ?spaceId');
    expect(query).toContain('@timestamp >= ?gte::DATETIME');
    expect(query).toContain('@timestamp <= ?lte::DATETIME');
    expect(params).toEqual(
      expect.arrayContaining([
        { spaceId: baseOpts.spaceId },
        { gte: baseOpts.gte },
        { lte: baseOpts.lte },
      ])
    );
  });

  it('inlines a single rule id literal when exactly one rule id is provided', () => {
    const { query } = buildAlertSummaryQuery({ ...baseOpts, ruleIds: ['rule-a'] });
    expect(query).toMatch(/rule\.id IN \("rule-a"\)/);
  });

  it('inlines one literal per rule id, preserving input order', () => {
    const ruleIds = ['rule-a', 'rule-b', 'rule-c'];
    const { query, params } = buildAlertSummaryQuery({ ...baseOpts, ruleIds });
    expect(query).toMatch(/rule\.id IN \("rule-a", "rule-b", "rule-c"\)/);
    expect(params).not.toEqual(expect.arrayContaining([expect.objectContaining({ 0: 'rule-a' })]));
  });

  it('splits active and recovered counts via STATS .. WHERE', () => {
    const { query } = buildAlertSummaryQuery(baseOpts);
    expect(query).toMatch(/active_events\s*=\s*COUNT\(\*\) WHERE status == "breached"/);
    expect(query).toMatch(/recovered_events\s*=\s*COUNT\(\*\) WHERE status == "recovered"/);
  });

  it('buckets by @timestamp using the requested fixed interval', () => {
    const { query } = buildAlertSummaryQuery({ ...baseOpts, fixedInterval: '30 minutes' });
    expect(query).toContain('BY bucket = BUCKET(@timestamp, 30 minutes)');
    expect(query).toContain('SORT bucket ASC');
    expect(query).not.toMatch(/\| EVAL bucket/);
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
