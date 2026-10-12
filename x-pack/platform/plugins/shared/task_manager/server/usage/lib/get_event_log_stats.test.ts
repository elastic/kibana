/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getEventLogStats, nanosToMillis } from './get_event_log_stats';
import type { EventLogStatsAggregations } from './types';
import { EVENT_LOG_INDEX, MAX_TASK_TYPE_BUCKETS } from '../constants';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
const signal = new AbortController().signal;

/**
 * The Elasticsearch aggregation response types are a broad union that cannot be constructed
 * literally, so the assembled response is cast once here while each test still supplies
 * aggregations typed against the interface the code actually reads.
 */
const mockSearchResponse = (
  total: estypes.SearchResponse['hits']['total'],
  aggregations?: EventLogStatsAggregations
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total, max_score: null, hits: [] },
    ...(aggregations ? { aggregations } : {}),
  } as unknown as estypes.SearchResponse);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('nanosToMillis', () => {
  test('returns 0 when passing 0 nanos', () => {
    expect(nanosToMillis(0)).toEqual(0);
  });

  test('converts 1000000 nanos to 1ms', () => {
    expect(nanosToMillis(1000000)).toEqual(1);
  });

  test('rounds 750000 nanos (0.75ms) to 1ms', () => {
    expect(nanosToMillis(750000)).toEqual(1);
  });

  test('returns null when passing null', () => {
    expect(nanosToMillis(null)).toEqual(null);
  });

  test('returns null when passing undefined', () => {
    expect(nanosToMillis(undefined)).toEqual(null);
  });
});

describe('getEventLogStats', () => {
  it('queries the event log for task-run-start events in the last 24h', async () => {
    esClient.search.mockResponseOnce(
      mockSearchResponse(
        { value: 0, relation: 'eq' },
        {
          by_task_type: { buckets: [], sum_other_doc_count: 0 },
          delay_percentiles: { values: {} },
        }
      )
    );

    await getEventLogStats(esClient, signal);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: EVENT_LOG_INDEX,
        size: 0,
        track_total_hits: true,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run-start' } },
              { range: { '@timestamp': { gte: 'now-24h' } } },
            ],
          },
        },
        aggs: {
          by_task_type: {
            terms: { field: 'kibana.task.type', size: MAX_TASK_TYPE_BUCKETS },
          },
          delay_percentiles: {
            percentiles: {
              field: 'kibana.task.schedule_delay',
              percents: [50, 75, 95, 99],
            },
          },
        },
      }),
      { signal }
    );
  });

  it("forwards the task's abort signal so a timeout cancels the aggregation", async () => {
    const abortController = new AbortController();
    esClient.search.mockResponseOnce(mockSearchResponse({ value: 0, relation: 'eq' }));

    await getEventLogStats(esClient, abortController.signal);

    expect(esClient.search).toHaveBeenCalledWith(expect.anything(), {
      signal: abortController.signal,
    });
  });

  it('returns totals, by-type counts and delay percentiles converted to ms', async () => {
    esClient.search.mockResponseOnce(
      mockSearchResponse(
        { value: 150, relation: 'eq' },
        {
          by_task_type: {
            buckets: [
              { key: 'alerting:.index-threshold', doc_count: 100 },
              { key: 'actions:.server-log', doc_count: 50 },
            ],
            sum_other_doc_count: 0,
          },
          delay_percentiles: {
            values: {
              '50.0': 100000000,
              '75.0': 250000000,
              '95.0': 1200000000,
              '99.0': 5000000000,
            },
          },
        }
      )
    );

    const result = await getEventLogStats(esClient, signal);

    expect(result).toEqual({
      total_task_runs_24hr: 150,
      task_runs_by_type_24hr: [
        { name: 'alerting:.index-threshold', value: 100 },
        { name: 'actions:.server-log', value: 50 },
      ],
      task_runs_other_24hr: 0,
      schedule_delay_ms_24hr: { p50: 100, p75: 250, p95: 1200, p99: 5000 },
    });
  });

  it('reports the runs excluded from a truncated by-type breakdown', async () => {
    esClient.search.mockResponseOnce(
      mockSearchResponse(
        { value: 500, relation: 'eq' },
        {
          by_task_type: {
            buckets: [{ key: 'alerting:.index-threshold', doc_count: 300 }],
            sum_other_doc_count: 200,
          },
          delay_percentiles: { values: {} },
        }
      )
    );

    const result = await getEventLogStats(esClient, signal);

    expect(result.task_runs_other_24hr).toBe(200);
    // The breakdown plus the remainder must always reconcile against the reported total.
    const breakdownTotal = result.task_runs_by_type_24hr!.reduce(
      (sum, { value }) => sum + value,
      0
    );
    expect(breakdownTotal + result.task_runs_other_24hr!).toBe(result.total_task_runs_24hr);
  });

  it('returns defaults when aggregations are undefined', async () => {
    esClient.search.mockResponseOnce(mockSearchResponse({ value: 0, relation: 'eq' }));

    const result = await getEventLogStats(esClient, signal);

    expect(result).toEqual({
      total_task_runs_24hr: 0,
      task_runs_by_type_24hr: [],
      task_runs_other_24hr: 0,
      schedule_delay_ms_24hr: { p50: null, p75: null, p95: null, p99: null },
    });
  });

  it('returns null percentiles when the event log has no schedule_delay values', async () => {
    esClient.search.mockResponseOnce(
      mockSearchResponse(
        { value: 3, relation: 'eq' },
        {
          by_task_type: {
            buckets: [{ key: 'task_manager:snapshot_telemetry', doc_count: 3 }],
            sum_other_doc_count: 0,
          },
          delay_percentiles: {
            values: { '50.0': null, '75.0': null, '95.0': null, '99.0': null },
          },
        }
      )
    );

    const result = await getEventLogStats(esClient, signal);

    expect(result.total_task_runs_24hr).toBe(3);
    expect(result.schedule_delay_ms_24hr).toEqual({ p50: null, p75: null, p95: null, p99: null });
  });

  it('handles the numeric hits.total format', async () => {
    esClient.search.mockResponseOnce(
      mockSearchResponse(5, {
        by_task_type: { buckets: [], sum_other_doc_count: 0 },
        delay_percentiles: { values: {} },
      })
    );

    const result = await getEventLogStats(esClient, signal);

    expect(result.total_task_runs_24hr).toBe(5);
  });

  it('propagates elasticsearch errors to the caller', async () => {
    esClient.search.mockRejectedValueOnce(new Error('index_not_found_exception'));

    await expect(getEventLogStats(esClient, signal)).rejects.toThrow('index_not_found_exception');
  });
});
