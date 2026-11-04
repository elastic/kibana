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

/** Range aggregation response with one slot per histogram bucket. */
const slots = (...counts: number[]) => ({ buckets: counts.map((count) => ({ doc_count: count })) });

/** Overlap aggregations from per-slot started/ended counts. */
const overlap = (started: number[], ended: number[]) => ({
  started: slots(...started),
  ended: slots(...ended),
});

const getRequestBody = () => {
  const [, callOptions] = mockHttp.post.mock.calls[0] as unknown as [string, { body: string }];
  return JSON.parse(callOptions.body);
};

describe('fetchClassicAlertsHistogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests started/ended range aggregations and derives overlap counts from running totals', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      // started before bucket end: 3, then 3 + 1; ended at or before bucket start: 0, then 0 + 2
      aggregations: overlap([3, 1], [0, 2]),
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
    expect(Object.keys(body.aggs)).toEqual(['started', 'ended']);
    expect(body.aggs.ended.range.missing).toBe(NOW);
    expect(result).toEqual({
      counts: [
        { bucketStart: buckets[0].start, count: 3 },
        { bucketStart: buckets[1].start, count: 2 },
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
        breakdown: {
          sum_other_doc_count: 0,
          buckets: [
            { key: 'active', ...overlap([2, 0], [0, 0]) },
            { key: 'recovered', ...overlap([2, 0], [0, 2]) },
            { key: 'untracked', ...overlap([1, 0], [0, 1]) },
          ],
        },
      },
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets,
      nowMs: NOW,
      breakdownField: 'episode.status',
    });

    expect(getRequestBody().aggs.breakdown.terms.field).toBe('kibana.alert.status');
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 2, breakdown: 'active' },
      { bucketStart: buckets[1].start, count: 2, breakdown: 'active' },
      { bucketStart: buckets[0].start, count: 3, breakdown: 'inactive' },
    ]);
  });

  it('maps the ack breakdown onto kibana.alert.workflow_status', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        breakdown: {
          buckets: [
            { key: 'acknowledged', ...overlap([1], [0]) },
            { key: 'open', ...overlap([2], [0]) },
            { key: 'closed', ...overlap([1], [0]) },
          ],
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

    const { terms } = getRequestBody().aggs.breakdown;
    expect(terms).toMatchObject({ field: 'kibana.alert.workflow_status', missing: 'open' });
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 1, breakdown: 'ack' },
      { bucketStart: buckets[0].start, count: 3, breakdown: 'unack' },
    ]);
  });

  it('counts breakdowns without a classic equivalent as unknown and skips empty buckets', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: overlap([6, 0], [0, 6]),
    });

    const result = await fetchClassicAlertsHistogram({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      buckets,
      nowMs: NOW,
      breakdownField: 'last_assignee_uid',
    });

    expect(getRequestBody().aggs).not.toHaveProperty('breakdown');
    expect(result.counts).toEqual([
      { bucketStart: buckets[0].start, count: 6, breakdown: 'unknown' },
    ]);
  });

  it('reports isCapHit when breakdown terms are truncated', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {
        breakdown: {
          sum_other_doc_count: 10,
          buckets: [{ key: 'rule-a', ...overlap([50], [0]) }],
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
