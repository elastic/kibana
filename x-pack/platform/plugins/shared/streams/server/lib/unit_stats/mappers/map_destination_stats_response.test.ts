/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsDestinationResultSchema } from '@kbn/streams-schema';
import {
  mapDestinationStatsResponse,
  mapDestinationStatsRows,
  noDestinationStats,
  type DestinationStatsAggregations,
} from './map_destination_stats_response';

const bucketMs = 60_000;
const seconds = 300;

const map = (aggregations: DestinationStatsAggregations | undefined) =>
  mapDestinationStatsResponse({ aggregations, seconds, bucketMs });

const withData: DestinationStatsAggregations = {
  by_id: {
    buckets: [
      {
        key: 'es-prod',
        items: {
          doc_count: 6,
          sum: { value: 30 },
          series: {
            buckets: [
              { key: Date.parse('2026-10-19T11:56:00.000Z'), doc_count: 3, sum: { value: 20 } },
              { key: Date.parse('2026-10-19T11:57:00.000Z'), doc_count: 3, sum: { value: 10 } },
            ],
          },
          failures: { doc_count: 1, sum: { value: 6 } },
        },
        duration: { doc_count: 6, average: { value: 0.107 } },
      },
    ],
  },
};

describe('mapDestinationStatsRows', () => {
  const series = [
    { bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
    { bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
  ];
  const joined = { incoming_rate: 4.6, failed_rate: 0, avg_latency: 0.18, series };

  it('places the joined rows into the result, with units', () => {
    const result = mapDestinationStatsRows({ rows: { 'es-prod': joined }, bucketMs })['es-prod'];

    expect(result).toEqual({
      latency: { average: { value: 0.18, unit: 's' } },
      events: {
        incoming: {
          total: { value: 510, unit: '{item}' },
          rate: { value: 4.6, unit: '{item}', time_unit: 's' },
          series: {
            bucket_ms: bucketMs,
            points: [
              { start: '2026-10-20T10:00:00.000Z', value: 270 },
              { start: '2026-10-20T10:01:00.000Z', value: 240 },
            ],
          },
          failures: { rate: { value: 0, unit: '{item}', time_unit: 's' } },
        },
      },
    });
    expect(streamsUnitStatsDestinationResultSchema.parse(result)).toEqual(result);
  });

  it('has a result for every destination', () => {
    const rows = { 'es-prod': joined, 'es-dev': { ...joined, incoming_rate: 4.2 } };

    const results = mapDestinationStatsRows({ rows, bucketMs });

    expect(Object.keys(results)).toEqual(['es-prod', 'es-dev']);
    expect(results['es-dev'].events.incoming.rate.value).toBe(4.2);
  });

  it('leaves a column that ES|QL returned as null as no data, and keeps the series', () => {
    const rows = {
      'es-prod': { incoming_rate: null, failed_rate: null, avg_latency: null, series },
    };

    const result = mapDestinationStatsRows({ rows, bucketMs })['es-prod'];

    expect(result.latency.average).toEqual({ value: null, unit: null });
    expect(result.events.incoming.rate).toEqual({ value: null, unit: null, time_unit: null });
    expect(result.events.incoming.failures.rate).toEqual({
      value: null,
      unit: null,
      time_unit: null,
    });
    expect(result.events.incoming.total.value).toBe(510);
  });

  it('leaves a destination with no rate row as no data for the rates', () => {
    const result = mapDestinationStatsRows({ rows: { 'es-prod': { series } }, bucketMs })[
      'es-prod'
    ];

    expect(result.events.incoming.rate.value).toBeNull();
    expect(result.latency.average.value).toBeNull();
    expect(result.events.incoming.series.points).toHaveLength(2);
  });
});

describe('mapDestinationStatsResponse', () => {
  it('maps a bucket with data, with units', () => {
    const result = map(withData).get('es-prod');

    expect(result).toEqual({
      latency: { average: { value: 0.107, unit: 's' } },
      events: {
        incoming: {
          total: { value: 30, unit: '{item}' },
          rate: { value: 0.1, unit: '{item}', time_unit: 's' },
          series: {
            bucket_ms: bucketMs,
            points: [
              { start: '2026-10-19T11:56:00.000Z', value: 20 },
              { start: '2026-10-19T11:57:00.000Z', value: 10 },
            ],
          },
          failures: { rate: { value: 0.02, unit: '{item}', time_unit: 's' } },
        },
      },
    });
    expect(streamsUnitStatsDestinationResultSchema.parse(result)).toEqual(result);
  });

  it('totals the series points, so the total always agrees with the bars', () => {
    const result = map(withData).get('es-prod');
    const points = result?.events.incoming.series.points ?? [];

    expect(result?.events.incoming.total.value).toBe(points.reduce((sum, p) => sum + p.value, 0));
  });

  it('has no entry for an id with no bucket', () => {
    expect(map({ by_id: { buckets: [] } }).size).toBe(0);
    expect(map(undefined).size).toBe(0);
  });

  it('is all null when the bucket has no items documents', () => {
    const result = map({
      by_id: {
        buckets: [
          {
            key: 'es-dev',
            items: { doc_count: 0, sum: { value: 0 }, series: { buckets: [] } },
            duration: { doc_count: 0, average: { value: null } },
          },
        ],
      },
    }).get('es-dev');

    expect(result).toEqual(noDestinationStats(bucketMs));
  });

  it('keeps latency null when items exist without duration documents', () => {
    const [bucket] = withData.by_id?.buckets ?? [];
    const result = map({
      by_id: { buckets: [{ ...bucket, duration: { doc_count: 0, average: { value: null } } }] },
    }).get('es-prod');

    expect(result?.latency.average).toEqual({ value: null, unit: null });
    expect(result?.events.incoming.total.value).toBe(30);
  });

  it('reports a failures rate of zero when items exist and none failed', () => {
    const [bucket] = withData.by_id?.buckets ?? [];
    const items = bucket.items ?? { doc_count: 0 };
    const result = map({
      by_id: {
        buckets: [
          { ...bucket, items: { ...items, failures: { doc_count: 0, sum: { value: 0 } } } },
        ],
      },
    }).get('es-prod');

    expect(result?.events.incoming.failures.rate).toEqual({
      value: 0,
      unit: '{item}',
      time_unit: 's',
    });
  });

  it('leaves the rates null when no time is covered', () => {
    const result = mapDestinationStatsResponse({
      aggregations: withData,
      seconds: undefined,
      bucketMs,
    }).get('es-prod');

    expect(result?.events.incoming.total.value).toBe(30);
    expect(result?.events.incoming.rate.value).toBeNull();
    expect(result?.events.incoming.failures.rate.value).toBeNull();
  });
});
