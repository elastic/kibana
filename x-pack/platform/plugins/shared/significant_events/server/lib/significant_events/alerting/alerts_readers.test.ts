/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  RULES_BUCKET_SIZE,
  buildChangePointHistogramBounds,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';
import { ALERTS_READER_V2 } from './alerts_reader';

const SPACE_ID = 'default';
const RULE_UUID = 'rule-abc';
const LOOKBACK = 'now-30m';
const BUCKET_INTERVAL = '30s';

const makeQueryLink = (
  overrides: { rule_id?: string; stream_name?: string; title?: string } = {}
): QueryLink => ({
  query: {
    id: 'q1',
    type: 'match',
    title: overrides.title ?? 'Test rule',
    description: 'desc',
    esql: { query: 'FROM logs | WHERE body.text:"error"' },
    severity_score: 60,
  },
  stream_name: overrides.stream_name ?? 'logs.test',
  rule_backed: true,
  rule_id: overrides.rule_id ?? RULE_UUID,
});

function createEsClient() {
  const search = jest.fn();
  return {
    search,
    client: { search } as unknown as TracedElasticsearchClient,
  };
}

describe('SignificantEventsAlertsReaderV2', () => {
  const reader = ALERTS_READER_V2;

  it('scopes the occurrences ES|QL request by type == "signal" and space_id', () => {
    const request = reader.buildOccurrencesEsqlRequest({
      ruleIds: [RULE_UUID],
      value: 30,
      esqlUnit: 'minutes',
      limit: 100,
      spaceId: SPACE_ID,
    });

    expect(request.query).toContain('type == "signal"');
    expect(request.query).toContain(`space_id == "${SPACE_ID}"`);
    expect(request.query).toContain(`rule.id IN ("${RULE_UUID}")`);
  });

  it('counts alerts with a distinct group_hash cardinality aggregation', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({ aggregations: { signal_count: { value: 21 } } });

    const result = await reader.countAlerts(client, { lookback: LOOKBACK, spaceId: SPACE_ID });

    expect(result).toBe(21);
    expect(search).toHaveBeenCalledWith('significant_events_alerts_v2_count_alerts', {
      index: '.rule-events',
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: SPACE_ID } },
            { range: { '@timestamp': { gte: LOOKBACK } } },
          ],
        },
      },
      aggs: {
        signal_count: {
          cardinality: { field: 'group_hash' },
        },
      },
    });
  });

  it('scopes countAlerts to a single rule when ruleUuid is provided', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({ aggregations: { signal_count: { value: 0 } } });

    await reader.countAlerts(client, {
      lookback: LOOKBACK,
      spaceId: SPACE_ID,
      ruleUuid: RULE_UUID,
    });

    expect(search).toHaveBeenCalledWith(
      'significant_events_alerts_v2_count_alerts',
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'rule.id': RULE_UUID } }]),
          },
        },
      })
    );
  });

  it('normalizes change-point buckets to distinct signal counts and query link metadata', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({
      took: 17,
      aggregations: {
        by_rule: {
          buckets: [
            {
              key: RULE_UUID,
              doc_count: 100,
              signal_count: { value: 42 },
              change_points: { type: { mean_shift: { p_value: 0.02 } } },
            },
          ],
        },
      },
    });

    const result = await reader.runChangePointScan(
      client,
      { lookback: LOOKBACK, bucketInterval: BUCKET_INTERVAL, spaceId: SPACE_ID },
      [makeQueryLink({ title: 'Linked rule title' })]
    );

    expect(search).toHaveBeenCalledWith(
      'significant_events_alerts_v2_change_point_scan',
      expect.objectContaining({
        index: '.rule-events',
        track_total_hits: false,
        aggs: {
          by_rule: {
            terms: { field: 'rule.id', size: RULES_BUCKET_SIZE },
            aggs: {
              signal_count: {
                cardinality: { field: 'group_hash' },
              },
              ...buildChangePointTimeSeriesAggs(BUCKET_INTERVAL, {
                extendedBounds: buildChangePointHistogramBounds(LOOKBACK, BUCKET_INTERVAL),
              }),
            },
          },
        },
      })
    );
    expect(result.took).toBe(17);
    expect(result.by_rule.buckets).toEqual([
      {
        key: RULE_UUID,
        doc_count: 42,
        rule_name: {
          top: [{ metrics: { 'kibana.alert.rule.name': 'Linked rule title' } }],
        },
        stream: { buckets: [{ key: 'logs.test' }] },
        change_points: { type: { mean_shift: { p_value: 0.02 } } },
      },
    ]);
  });
});
