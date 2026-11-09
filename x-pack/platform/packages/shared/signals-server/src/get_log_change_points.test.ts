/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { computeSamplingProbability, getLogChangePoint } from './get_log_change_points';
import { getChangePoints as getChangePointsDirect } from './get_change_points';

describe('computeSamplingProbability', () => {
  it('returns 1 when the hit count does not need aggressive downsampling', () => {
    expect(computeSamplingProbability({ totalHits: 1000, targetSampleSize: 500_000 })).toBe(1);
    expect(computeSamplingProbability({ totalHits: 900_000, targetSampleSize: 500_000 })).toBe(1);
  });

  it('returns a fraction below 0.5 when the hit count exceeds twice the target sample size', () => {
    expect(computeSamplingProbability({ totalHits: 2_000_000, targetSampleSize: 500_000 })).toBe(
      0.25
    );
  });
});

describe('getChangePoints', () => {
  it('Preserves stationary and indeterminable bucket types alongside spikes', async () => {
    const result = await getChangePointsDirect({
      buckets: [
        {
          key: 'timeout calling payments',
          regex: 'timeout.*payments',
          changes: {
            type: { spike: { p_value: 0.001 } } as never,
            bucket: { key: '2026-11-02T11:30:00.000Z', doc_count: 42 },
          },
          time_series: {
            buckets: [{ key: 1, key_as_string: '2026-11-02T11:00:00.000Z', doc_count: 42 }],
          },
        },
        {
          key: 'healthcheck ok',
          changes: {
            type: { stationary: {} } as never,
          },
          time_series: { buckets: [] },
        },
      ],
    });

    expect(result.map((item) => item.changes.type)).toEqual(['spike', 'stationary']);
    expect(result[0].timeSeries).toHaveLength(1);
    expect(result[1].timeSeries).toBeUndefined();
  });
});

describe('getLogChangePoint', () => {
  it('returns an empty list without running aggregations when no documents match', async () => {
    const search = jest.fn().mockResolvedValueOnce({ hits: { total: { value: 0 } } });
    const esClient = { asCurrentUser: { search } } as unknown as IScopedClusterClient;

    const result = await getLogChangePoint({
      index: 'logs-*',
      start: '2026-11-02T11:00:00.000Z',
      end: '2026-11-02T12:00:00.000Z',
      kqlFilter: 'service.name : "checkout"',
      messageField: 'message',
      esClient,
    });

    expect(result).toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('uses the requested time field in the time filter and histogram', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({ hits: { total: { value: 4 } } })
      .mockResolvedValueOnce({});
    const esClient = { asCurrentUser: { search } } as unknown as IScopedClusterClient;

    await getLogChangePoint({
      index: 'logs-*',
      start: '2026-11-02T11:00:00.000Z',
      end: '2026-11-02T12:00:00.000Z',
      messageField: 'message',
      timeField: 'event.ingested',
      esClient,
    });

    const timeFilter = search.mock.calls[0][0].query.bool.filter[0];
    expect(timeFilter.range['event.ingested']).toBeDefined();
    expect(
      search.mock.calls[1][0].aggs.sampler.aggs.groups.aggs.time_series.auto_date_histogram.field
    ).toBe('event.ingested');
  });
});
