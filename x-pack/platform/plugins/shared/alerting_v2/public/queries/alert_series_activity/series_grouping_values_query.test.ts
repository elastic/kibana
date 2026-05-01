/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  buildSeriesGroupingValuesQuery,
  parseSeriesGroupingValuesResponse,
} from './series_grouping_values_query';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-episodes-ui/constants';

const RULE_ID = 'rule-abc';
const GTE_MS = Date.UTC(2026, 3, 23);
const LTE_MS = Date.UTC(2026, 3, 30);

describe('buildSeriesGroupingValuesQuery', () => {
  it('targets the alert events data stream with size 0', () => {
    const request = buildSeriesGroupingValuesQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1', 'gh-2'],
      groupingFields: ['host'],
      gteMs: GTE_MS,
      lteMs: LTE_MS,
    });

    expect(request.index).toBe(ALERT_EVENTS_DATA_STREAM);
    expect(request.size).toBe(0);
  });

  it('filters by rule.id, type=alert, group_hash set, and timestamp window', () => {
    const request = buildSeriesGroupingValuesQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1', 'gh-2'],
      groupingFields: ['host'],
      gteMs: GTE_MS,
      lteMs: LTE_MS,
    });

    const filters = request.query?.bool?.filter as object[];
    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { 'rule.id': RULE_ID } },
        { term: { type: 'alert' } },
        { terms: { group_hash: ['gh-1', 'gh-2'] } },
        {
          range: {
            '@timestamp': {
              gte: new Date(GTE_MS).toISOString(),
              lte: new Date(LTE_MS).toISOString(),
            },
          },
        },
      ])
    );
  });

  it('aggregates by group_hash with one terms sub-agg per grouping field', () => {
    const request = buildSeriesGroupingValuesQuery({
      ruleId: RULE_ID,
      groupHashes: ['gh-1'],
      groupingFields: ['host', 'region'],
      gteMs: GTE_MS,
      lteMs: LTE_MS,
    });

    const byGroup = request.aggs?.by_group as {
      terms: { field: string; size: number };
      aggs: Record<string, { terms: { field: string; size: number } }>;
    };

    expect(byGroup.terms).toEqual({ field: 'group_hash', size: 1 });
    expect(byGroup.aggs.host.terms).toEqual({ field: 'data.host', size: 1 });
    expect(byGroup.aggs.region.terms).toEqual({ field: 'data.region', size: 1 });
  });

  it('sizes the by_group terms agg to fit all requested hashes (min 1)', () => {
    const big = buildSeriesGroupingValuesQuery({
      ruleId: RULE_ID,
      groupHashes: Array.from({ length: 50 }, (_, i) => `gh-${i}`),
      groupingFields: ['host'],
      gteMs: GTE_MS,
      lteMs: LTE_MS,
    });
    const empty = buildSeriesGroupingValuesQuery({
      ruleId: RULE_ID,
      groupHashes: [],
      groupingFields: ['host'],
      gteMs: GTE_MS,
      lteMs: LTE_MS,
    });

    expect((big.aggs?.by_group as { terms: { size: number } }).terms.size).toBe(50);
    expect((empty.aggs?.by_group as { terms: { size: number } }).terms.size).toBe(1);
  });
});

describe('parseSeriesGroupingValuesResponse', () => {
  const buildResponse = (
    buckets: Array<{ key: string; fields: Record<string, string | null> }>
  ): SearchResponse<unknown, Record<string, AggregationsAggregate>> =>
    ({
      aggregations: {
        by_group: {
          buckets: buckets.map(({ key, fields }) => ({
            key,
            doc_count: 1,
            ...Object.fromEntries(
              Object.entries(fields).map(([field, value]) => [
                field,
                {
                  buckets: value == null ? [] : [{ key: value, doc_count: 1 }],
                },
              ])
            ),
          })),
        },
      },
    } as unknown as SearchResponse<unknown, Record<string, AggregationsAggregate>>);

  it('maps each group_hash to its first-bucket value per field', () => {
    const response = buildResponse([
      { key: 'gh-1', fields: { host: 'web-01', region: 'us-east' } },
      { key: 'gh-2', fields: { host: 'web-02', region: 'eu-west' } },
    ]);

    const result = parseSeriesGroupingValuesResponse(response, ['host', 'region']);

    expect(result).toEqual({
      'gh-1': { host: 'web-01', region: 'us-east' },
      'gh-2': { host: 'web-02', region: 'eu-west' },
    });
  });

  it('returns null for fields with no bucket', () => {
    const response = buildResponse([{ key: 'gh-1', fields: { host: null } }]);

    const result = parseSeriesGroupingValuesResponse(response, ['host']);

    expect(result).toEqual({ 'gh-1': { host: null } });
  });

  it('returns an empty map when there are no buckets', () => {
    const response = {
      aggregations: { by_group: { buckets: [] } },
    } as unknown as SearchResponse<unknown, Record<string, AggregationsAggregate>>;

    expect(parseSeriesGroupingValuesResponse(response, ['host'])).toEqual({});
  });

  it('returns an empty map when aggregations are missing', () => {
    const response = {} as SearchResponse<unknown, Record<string, AggregationsAggregate>>;

    expect(parseSeriesGroupingValuesResponse(response, ['host'])).toEqual({});
  });
});
