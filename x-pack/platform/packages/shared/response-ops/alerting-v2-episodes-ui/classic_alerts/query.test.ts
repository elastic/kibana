/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildClassicAlertsQuery,
  buildClassicAlertsSort,
  buildClassicAlertsKpiAggs,
  resolveV1BreakdownField,
  normalizeV1StatusValue,
} from './query';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';

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
    const statusFilter = filters.find((f) => f != null && typeof f === 'object' && 'terms' in f) as
      | { terms: { 'kibana.alert.status': string[] } }
      | undefined;

    expect(statusFilter?.terms['kibana.alert.status']).toEqual(
      expect.arrayContaining(['recovered', 'untracked'])
    );
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
      expect.arrayContaining([{ terms: { 'kibana.alert.rule.tags': ['error', 'prod'] } }])
    );
  });

  it('adds a severity filter for known values', () => {
    const query = buildClassicAlertsQuery({ severity: ['critical', 'high'] });
    const filters = getFilters(query);
    const severityFilter = filters.find((f) => f != null && typeof f === 'object' && 'bool' in f);
    expect(severityFilter).toBeDefined();
  });

  it('returns MATCH_NONE when assigneeUid is set (no v1 equivalent)', () => {
    const query = buildClassicAlertsQuery({ assigneeUid: 'user-1' });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ bool: { must_not: { match_all: {} } } }])
    );
  });

  it('adds a query_string filter for search text', () => {
    const query = buildClassicAlertsQuery({ queryString: 'host:web-01' });

    expect(getFilters(query)).toEqual(
      expect.arrayContaining([{ query_string: { query: 'host:web-01' } }])
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
});

describe('resolveV1BreakdownField', () => {
  it('maps episode.status to kibana.alert.status', () => {
    expect(resolveV1BreakdownField('episode.status')).toBe('kibana.alert.status');
  });

  it('maps rule.id to kibana.alert.rule.uuid', () => {
    expect(resolveV1BreakdownField('rule.id')).toBe('kibana.alert.rule.uuid');
  });

  it('returns undefined for fields with no v1 equivalent', () => {
    expect(resolveV1BreakdownField('last_ack_action')).toBeUndefined();
    expect(resolveV1BreakdownField('last_assignee_uid')).toBeUndefined();
    expect(resolveV1BreakdownField('unknown_field')).toBeUndefined();
  });
});

describe('normalizeV1StatusValue', () => {
  it('maps active to active', () => {
    expect(normalizeV1StatusValue('active')).toBe('active');
  });

  it('maps recovered to inactive', () => {
    expect(normalizeV1StatusValue('recovered')).toBe('inactive');
  });

  it('maps untracked to inactive', () => {
    expect(normalizeV1StatusValue('untracked')).toBe('inactive');
  });

  it('maps unknown values to inactive', () => {
    expect(normalizeV1StatusValue('delayed')).toBe('inactive');
  });
});

describe('buildClassicAlertsKpiAggs', () => {
  it('returns aggregations for firing_rules, acknowledged, muted, and snoozed', () => {
    const aggs = buildClassicAlertsKpiAggs();

    expect(aggs).toHaveProperty('firing_rules');
    expect(aggs).toHaveProperty('acknowledged');
    expect(aggs).toHaveProperty('muted');
    expect(aggs).toHaveProperty('snoozed');
  });

  it('firing_rules filters on active status with a cardinality sub-agg', () => {
    const aggs = buildClassicAlertsKpiAggs();

    expect(aggs.firing_rules).toEqual({
      filter: { term: { 'kibana.alert.status': 'active' } },
      aggs: { rules: { cardinality: { field: 'kibana.alert.rule.uuid' } } },
    });
  });
});
