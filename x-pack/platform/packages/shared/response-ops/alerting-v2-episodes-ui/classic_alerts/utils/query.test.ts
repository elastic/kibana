/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
} from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  buildClassicAlertsHistogramAggs,
  buildClassicAlertsQuery,
  buildClassicAlertsSort,
  resolveClassicHistogramBreakdown,
} from './query';

/** Extracts `bool.filter` from a query container, throwing if the shape is unexpected. */
const getFilters = (query: unknown): unknown[] => {
  const q = query as { bool?: { filter?: unknown } };
  const filters = q.bool?.filter;
  if (!Array.isArray(filters)) {
    throw new Error(`Expected bool.filter array, got: ${JSON.stringify(query)}`);
  }
  return filters;
};

const DELAYED_EXCLUSION_FILTER = {
  bool: { must_not: { term: { 'kibana.alert.status': 'delayed' } } },
};

describe('buildClassicAlertsQuery', () => {
  it('always excludes delayed alerts even when no other filters are provided', () => {
    const q1 = buildClassicAlertsQuery();
    const q2 = buildClassicAlertsQuery(undefined, undefined);
    expect(getFilters(q1)).toContainEqual(DELAYED_EXCLUSION_FILTER);
    expect(getFilters(q2)).toContainEqual(DELAYED_EXCLUSION_FILTER);
  });

  it('adds a time range filter', () => {
    const query = buildClassicAlertsQuery(undefined, {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-02T00:00:00.000Z',
    });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          range: { '@timestamp': expect.objectContaining({ gte: expect.any(String) }) },
        }),
      ])
    );
  });

  it('maps active episode status to active classic status', () => {
    const query = buildClassicAlertsQuery({ status: [ALERT_EPISODE_STATUS.ACTIVE] });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ terms: { 'kibana.alert.status': ['active'] } }])
    );
  });

  it('maps inactive episode status to recovered and untracked', () => {
    const query = buildClassicAlertsQuery({ status: [ALERT_EPISODE_STATUS.INACTIVE] });
    const filters = getFilters(query);
    expect(filters).toContainEqual({
      terms: { 'kibana.alert.status': expect.arrayContaining(['recovered', 'untracked']) },
    });
  });

  it('adds a ruleId filter', () => {
    const query = buildClassicAlertsQuery({ ruleId: 'rule-123' });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ term: { 'kibana.alert.rule.uuid': 'rule-123' } }])
    );
  });

  it('adds a tags filter', () => {
    const query = buildClassicAlertsQuery({ tags: ['error', 'prod'] });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ terms: { 'kibana.alert.workflow_tags': ['error', 'prod'] } }])
    );
  });

  it('adds a severity filter for known values', () => {
    const query = buildClassicAlertsQuery({ severity: ['critical', 'high'] });
    expect(getFilters(query)).toContainEqual({
      bool: {
        should: [{ terms: { 'kibana.alert.severity': ['critical', 'high'] } }],
        minimum_should_match: 1,
      },
    });
  });

  it('filters warning to only warning results', () => {
    const query = buildClassicAlertsQuery({ severity: ['warning'] });
    const filters = getFilters(query);
    expect(filters).toContainEqual({
      bool: {
        should: [{ terms: { 'kibana.alert.severity': ['warning'] } }],
        minimum_should_match: 1,
      },
    });
    expect(filters).not.toContainEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          should: expect.arrayContaining([
            { terms: { 'kibana.alert.severity': expect.arrayContaining(['medium']) } },
          ]),
        }),
      })
    );
  });

  it('filters medium to only medium results', () => {
    const query = buildClassicAlertsQuery({ severity: ['medium'] });
    const filters = getFilters(query);
    expect(filters).toContainEqual({
      bool: {
        should: [{ terms: { 'kibana.alert.severity': ['medium'] } }],
        minimum_should_match: 1,
      },
    });
    expect(filters).not.toContainEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          should: expect.arrayContaining([
            { terms: { 'kibana.alert.severity': expect.arrayContaining(['warning']) } },
          ]),
        }),
      })
    );
  });

  it('returns MATCH_NONE when assigneeUid is set (no classic equivalent)', () => {
    const query = buildClassicAlertsQuery({ assigneeUid: 'user-1' });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ bool: { must_not: { match_all: {} } } }])
    );
  });

  it('keeps classic rows when Classic is included in sources', () => {
    const query = buildClassicAlertsQuery({
      sources: [EPISODE_SOURCE_FILTER_CLASSIC, 'zabbix'],
    });

    expect(getFilters(query)).not.toContainEqual({ bool: { must_not: { match_all: {} } } });
  });

  it('returns MATCH_NONE when sources omit Classic', () => {
    const query = buildClassicAlertsQuery({
      sources: [EPISODE_SOURCE_FILTER_UNIVERSAL, 'zabbix'],
    });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ bool: { must_not: { match_all: {} } } }])
    );
  });

  it('does not exclude classic rows when sources is empty', () => {
    const query = buildClassicAlertsQuery({ sources: [] });

    expect(getFilters(query)).not.toContainEqual({ bool: { must_not: { match_all: {} } } });
  });

  it('translates KQL search text to Elasticsearch DSL', () => {
    const query = buildClassicAlertsQuery({ queryString: 'kibana.alert.rule.name: test' });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([
        {
          bool: {
            minimum_should_match: 1,
            should: [{ match: { 'kibana.alert.rule.name': 'test' } }],
          },
        },
      ])
    );
  });

  it('ignores empty/whitespace query strings', () => {
    const query = buildClassicAlertsQuery({ queryString: '   ' });
    const filters = getFilters(query);
    expect(filters).toContainEqual(DELAYED_EXCLUSION_FILTER);
    expect(filters.some((f) => (f as Record<string, unknown>).query_string)).toBe(false);
  });
});

describe('buildClassicAlertsSort', () => {
  it('defaults to @timestamp desc when no sort state is provided', () => {
    const sort = buildClassicAlertsSort();
    expect(sort).toEqual([{ '@timestamp': { order: 'desc', unmapped_type: 'keyword' } }]);
  });

  it('maps episode sort fields to classic field names', () => {
    const sort = buildClassicAlertsSort({ sortField: 'episode.status', sortDirection: 'asc' });
    expect(sort).toEqual([{ 'kibana.alert.status': { order: 'asc', unmapped_type: 'keyword' } }]);
  });

  it('maps duration to kibana.alert.duration.us', () => {
    const sort = buildClassicAlertsSort({ sortField: 'duration', sortDirection: 'desc' });
    expect(sort).toEqual([
      { 'kibana.alert.duration.us': { order: 'desc', unmapped_type: 'keyword' } },
    ]);
  });

  it('falls back to @timestamp for unknown fields', () => {
    const sort = buildClassicAlertsSort({ sortField: 'unknown_field', sortDirection: 'asc' });
    expect(sort).toEqual([{ '@timestamp': { order: 'asc', unmapped_type: 'keyword' } }]);
  });

  it('generates a Painless script sort that includes severity extensions', () => {
    const sort = buildClassicAlertsSort({ sortField: 'severity', sortDirection: 'desc' }, [
      { value: 'warning', label: 'Warning', color: 'warning', sortRank: 4 },
    ]);
    expect(sort).toHaveLength(2);
    const scriptSort = sort[0] as { _script: { script: { source: string } } };
    expect(scriptSort._script.script.source).toContain("if (v == 'warning') { return 4; }");
    expect(scriptSort._script.script.source).toContain("if (v == 'critical') { return 7; }");
    expect(sort[1]).toEqual({ '@timestamp': { order: 'desc', unmapped_type: 'keyword' } });
  });
});

describe('buildClassicAlertsHistogramAggs', () => {
  const HOUR = 3_600_000;
  const T0 = new Date('2024-01-01T00:00:00.000Z').getTime();
  const buckets = [
    { start: T0, end: T0 + HOUR },
    { start: T0 + HOUR, end: T0 + 2 * HOUR },
  ];

  it('builds started/ended range aggregations with one contiguous slot per bucket', () => {
    const nowMs = T0 + 2 * HOUR;
    const aggs = buildClassicAlertsHistogramAggs({ buckets, nowMs });

    expect(aggs).toEqual({
      started: {
        range: {
          field: 'kibana.alert.start',
          ranges: [{ to: T0 + HOUR }, { from: T0 + HOUR, to: T0 + 2 * HOUR }],
        },
      },
      ended: {
        range: {
          field: 'kibana.alert.end',
          missing: nowMs,
          ranges: [{ to: T0 + 1 }, { from: T0 + 1, to: T0 + HOUR + 1 }],
        },
      },
    });
  });

  it('adds the range aggregations per top breakdown term next to the overall ones', () => {
    const aggs = buildClassicAlertsHistogramAggs({
      buckets,
      nowMs: T0,
      breakdown: resolveClassicHistogramBreakdown('rule.id'),
    });

    expect(Object.keys(aggs)).toEqual(['started', 'ended', 'breakdown']);
    expect(aggs.breakdown.terms).toEqual({
      field: 'kibana.alert.rule.uuid',
      missing: 'unknown',
      size: 9,
    });
    expect(Object.keys(aggs.breakdown.aggs ?? {})).toEqual(['started', 'ended']);
  });
});

describe('resolveClassicHistogramBreakdown', () => {
  it('returns undefined for breakdowns without a classic equivalent', () => {
    expect(resolveClassicHistogramBreakdown('last_assignee_uid')).toBeUndefined();
  });

  it('normalises classic status values onto episode statuses', () => {
    const breakdown = resolveClassicHistogramBreakdown('episode.status');
    expect(breakdown?.normalize('active')).toBe('active');
    expect(breakdown?.normalize('recovered')).toBe('inactive');
    expect(breakdown?.normalize('untracked')).toBe('inactive');
  });
});
