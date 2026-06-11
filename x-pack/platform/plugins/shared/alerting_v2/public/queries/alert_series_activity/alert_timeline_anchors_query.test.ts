/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertTimelineAnchorsQuery,
  parseAnchorRows,
  type AlertTimelineAnchorRow,
} from './alert_timeline_anchors_query';

describe('buildAlertTimelineAnchorsQuery', () => {
  it('aggregates the earliest timestamp per episode, scoped to rule, window and series', () => {
    const queryString = buildAlertTimelineAnchorsQuery({
      ruleId: 'rule-abc',
      gteMs: Date.parse('2026-04-01T00:00:00Z'),
      lteMs: Date.parse('2026-04-08T00:00:00Z'),
      groupHashes: ['hash-1', 'hash-2'],
    }).print('basic');

    expect(queryString).toContain('rule-abc');
    expect(queryString).toContain('2026-04-01T00:00:00.000Z');
    expect(queryString).toContain('2026-04-08T00:00:00.000Z');
    expect(queryString).toContain('group_hash IN');
    expect(queryString).toContain('hash-1');
    expect(queryString).toContain('hash-2');
    expect(queryString).toContain('STATS first_ts = MIN(@timestamp) BY episode.id');
  });
});

describe('parseAnchorRows', () => {
  it('maps episode.id to its earliest epoch-ms, skipping unparseable timestamps', () => {
    const rows: AlertTimelineAnchorRow[] = [
      { 'episode.id': 'ep-1', first_ts: '2026-04-01T00:00:00Z' },
      { 'episode.id': 'ep-2', first_ts: 'not-a-date' },
    ];

    const map = parseAnchorRows(rows);

    expect(map.get('ep-1')).toBe(Date.parse('2026-04-01T00:00:00Z'));
    expect(map.has('ep-2')).toBe(false);
  });
});
