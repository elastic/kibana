/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertsHistogram } from './fetch_classic_histogram';
import type { TimeBucket } from '../../utils/histogram_utils';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

const HOUR = 3_600_000;
const T0 = new Date('2024-01-01T00:00:00.000Z').getTime();
const buckets: TimeBucket[] = [
  { start: T0, end: T0 + HOUR },
  { start: T0 + HOUR, end: T0 + 2 * HOUR },
];
const NOW = T0 + 2 * HOUR;

const getRequestBody = () => {
  const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
  return JSON.parse(callOptions.body);
};

describe('fetchClassicAlertsHistogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests per-bucket filter aggregations without documents', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: { bucket_0: { doc_count: 3 }, bucket_1: { doc_count: 0 } },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets,
      nowMs: NOW,
    });

    const body = getRequestBody();
    expect(body.rule_type_ids).toEqual(TEST_RULE_TYPE_IDS);
    expect(body.size).toBe(0);
    expect(body._source).toBe(false);
    expect(Object.keys(body.aggs)).toEqual(['bucket_0', 'bucket_1']);
    expect(body.aggs.bucket_0).not.toHaveProperty('aggs');
    expect(result).toEqual({
      counts: [
        { bucketStart: buckets[0].start, count: 3 },
        { bucketStart: buckets[1].start, count: 0 },
      ],
      isCapHit: false,
    });
  });

  it('does not call the API when there are no buckets', async () => {
    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets: [],
      nowMs: NOW,
    });

    expect(mockHttp.post).not.toHaveBeenCalled();
    expect(result).toEqual({ counts: [], isCapHit: false });
  });

  it('maps the status breakdown onto kibana.alert.status and normalises values', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        bucket_0: {
          doc_count: 5,
          breakdown: {
            sum_other_doc_count: 0,
            buckets: [
              { key: 'active', doc_count: 2 },
              { key: 'recovered', doc_count: 2 },
              { key: 'untracked', doc_count: 1 },
            ],
          },
        },
        bucket_1: { doc_count: 0, breakdown: { sum_other_doc_count: 0, buckets: [] } },
      },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets,
      nowMs: NOW,
      breakdownField: 'episode.status',
    });

    expect(getRequestBody().aggs.bucket_0.aggs.breakdown.terms.field).toBe('kibana.alert.status');
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 2, breakdown: 'active' },
      { bucketStart: buckets[0].start, count: 3, breakdown: 'inactive' },
    ]);
  });

  it('maps the ack breakdown onto kibana.alert.workflow_status', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        bucket_0: {
          doc_count: 4,
          breakdown: {
            buckets: [
              { key: 'acknowledged', doc_count: 1 },
              { key: 'open', doc_count: 2 },
              { key: 'closed', doc_count: 1 },
            ],
          },
        },
      },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets: [buckets[0]],
      nowMs: NOW,
      breakdownField: 'last_ack_action',
    });

    const { terms } = getRequestBody().aggs.bucket_0.aggs.breakdown;
    expect(terms).toMatchObject({ field: 'kibana.alert.workflow_status', missing: 'open' });
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 1, breakdown: 'ack' },
      { bucketStart: buckets[0].start, count: 3, breakdown: 'unack' },
    ]);
  });

  it('counts breakdowns without a classic equivalent as unknown and skips empty buckets', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: { bucket_0: { doc_count: 6 }, bucket_1: { doc_count: 0 } },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets,
      nowMs: NOW,
      breakdownField: 'last_assignee_uid',
    });

    expect(getRequestBody().aggs.bucket_0).not.toHaveProperty('aggs');
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 6, breakdown: 'unknown' },
    ]);
  });

  it('reports isCapHit when breakdown terms are truncated', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        bucket_0: {
          doc_count: 60,
          breakdown: { sum_other_doc_count: 10, buckets: [{ key: 'rule-a', doc_count: 50 }] },
        },
      },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets: [buckets[0]],
      nowMs: NOW,
      breakdownField: 'rule.id',
    });

    expect(result.isCapHit).toBe(true);
  });
});
