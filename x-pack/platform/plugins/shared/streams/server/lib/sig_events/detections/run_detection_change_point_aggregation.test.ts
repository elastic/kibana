/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  runDetectionChangePointAggregation,
  runDetectionRuleActivity,
} from './run_detection_change_point_aggregation';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from '../alerts_data_stream';
import { V1_ALERTS_SOURCE, V2_ALERTS_SOURCE } from './detection_alerts_source';

describe('runDetectionChangePointAggregation', () => {
  const search = jest.fn();

  const esClient = { search } as unknown as ElasticsearchClient;

  const ruleMetadata = new Map([
    ['rule-a', { ruleName: 'Rule A', streamName: 'logs.test' }],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    search.mockResolvedValue({
      aggregations: {
        by_rule: {
          buckets: [
            {
              key: 'rule-a',
              doc_count: 10,
              change_points: { type: { spike: { p_value: 0.01 } } },
              last_5m: { doc_count: 2 },
            },
          ],
        },
      },
    });
  });

  it('queries v1 alerts index with rule uuid terms aggregation', async () => {
    await runDetectionChangePointAggregation({
      esClient,
      resolved: { alertsSource: V1_ALERTS_SOURCE, alertIndex: ALERTS_DATA_STREAM },
      params: { lookback: 'now-30m', bucketInterval: '30s', spaceId: 'default' },
      ruleMetadata,
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALERTS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.space_ids': ['default', '*'] } },
              { range: { '@timestamp': { gte: 'now-30m' } } },
            ],
          },
        },
        aggs: expect.objectContaining({
          by_rule: expect.objectContaining({
            terms: { field: 'kibana.alert.rule.uuid', size: 1000 },
          }),
        }),
      })
    );
  });

  it('queries v2 rule-events with cardinality on group_hash', async () => {
    await runDetectionChangePointAggregation({
      esClient,
      resolved: { alertsSource: V2_ALERTS_SOURCE, alertIndex: RULE_EVENTS_DATA_STREAM },
      params: { lookback: 'now-30m', bucketInterval: '30s', spaceId: 'default' },
      ruleMetadata,
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: RULE_EVENTS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { term: { type: 'signal' } },
              { term: { space_id: 'default' } },
              { range: { '@timestamp': { gte: 'now-30m' } } },
            ],
          },
        },
        aggs: expect.objectContaining({
          by_rule: expect.objectContaining({
            terms: { field: 'rule.id', size: 1000 },
            aggs: expect.objectContaining({
              over_time: expect.objectContaining({
                aggs: {
                  signal_count: {
                    cardinality: { field: 'group_hash' },
                  },
                },
              }),
              change_points: {
                change_point: { buckets_path: 'over_time>signal_count' },
              },
            }),
          }),
        }),
      })
    );
  });

  it('enriches v2 buckets with rule metadata from KI query links', async () => {
    const result = await runDetectionChangePointAggregation({
      esClient,
      resolved: { alertsSource: V2_ALERTS_SOURCE, alertIndex: RULE_EVENTS_DATA_STREAM },
      params: { lookback: 'now-30m', bucketInterval: '30s', spaceId: 'default' },
      ruleMetadata,
    });

    expect(result.alertIndex).toBe(RULE_EVENTS_DATA_STREAM);
    expect(result.aggregations.by_rule.buckets).toEqual([
      expect.objectContaining({
        key: 'rule-a',
        doc_count: 10,
        rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': 'Rule A' } }] },
        stream: { buckets: [{ key: 'logs.test' }] },
      }),
    ]);
  });
});

describe('runDetectionRuleActivity', () => {
  const search = jest.fn();

  const esClient = { search } as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    search.mockResolvedValue({
      aggregations: {
        activity_windows: {
          buckets: [{ key: 1, signal_count: { value: 3 } }],
        },
        peak: { value: 3 },
      },
    });
  });

  it('normalizes v2 activity buckets to doc_count for workflow compatibility', async () => {
    const result = await runDetectionRuleActivity({
      esClient,
      resolved: { alertsSource: V2_ALERTS_SOURCE, alertIndex: RULE_EVENTS_DATA_STREAM },
      params: {
        ruleUuid: 'rule-a',
        lookback: 'now-1h',
        windowInterval: '30m',
        spaceId: 'default',
      },
    });

    const buckets = (
      result.aggregations.activity_windows as { buckets: Array<{ doc_count: number }> }
    ).buckets;
    expect(buckets[0].doc_count).toBe(3);
  });
});
