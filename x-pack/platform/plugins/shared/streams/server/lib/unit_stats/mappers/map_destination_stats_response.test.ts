/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsDestinationResultSchema } from '@kbn/streams-schema';
import { mapDestinationStatsRows } from './map_destination_stats_response';

const bucketMs = 60_000;

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
