/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsProcessorResultSchema } from '@kbn/streams-schema';
import {
  averageSecondsPerEvent,
  mapProcessorStatsResponse,
  noProcessorStats,
  type ProcessorStatsAggregations,
} from './map_processor_stats_response';

const seconds = 300;

const map = (aggregations: ProcessorStatsAggregations | undefined) =>
  mapProcessorStatsResponse({ aggregations, seconds });

const bucket = (overrides: Partial<ProcessorStatsAggregations['by_id']> = {}) => ({
  by_id: {
    buckets: [
      {
        key: 'uppercase-message',
        items_in: {
          doc_count: 4,
          sum: { value: 30 },
          failures: { doc_count: 1, sum: { value: 3 } },
        },
        duration: { doc_count: 4, sum: { value: 0.0006 } },
      },
    ],
    ...overrides,
  },
});

describe('averageSecondsPerEvent', () => {
  it('divides the duration sum by the items sum', () => {
    expect(averageSecondsPerEvent(0.0006, 30)).toBe(0.0006 / 30);
  });

  it.each([
    [0.0006, 0],
    [0.0006, null],
    [0.0006, undefined],
    [null, 30],
    [undefined, 30],
  ])('is null for duration %p and items %p', (durationSum, itemsIn) => {
    expect(averageSecondsPerEvent(durationSum, itemsIn)).toBeNull();
  });
});

describe('mapProcessorStatsResponse', () => {
  it('maps a bucket with data, with units', () => {
    const result = map(bucket()).get('uppercase-message');

    expect(result).toEqual({
      processing_duration: { average: { value: 0.0006 / 30, unit: 's' } },
      events: {
        incoming: {
          rate: { value: 30 / seconds, unit: '{item}', time_unit: 's' },
          failures: { rate: { value: 3 / seconds, unit: '{item}', time_unit: 's' } },
        },
      },
    });
    expect(streamsUnitStatsProcessorResultSchema.parse(result)).toEqual(result);
  });

  it('divides by items, not by the number of collector calls', () => {
    // Four documents (batches) carry 30 items. A per batch average would be 0.0006 / 4.
    const average = map(bucket()).get('uppercase-message')?.processing_duration.average.value;

    expect(average).not.toBe(0.0006 / 4);
    expect(average).toBe(0.0006 / 30);
  });

  it('has no entry for an id with no bucket', () => {
    expect(map({ by_id: { buckets: [] } }).size).toBe(0);
    expect(map(undefined).size).toBe(0);
  });

  it('is all null when the bucket has no items in documents', () => {
    const result = map({
      by_id: {
        buckets: [
          {
            key: 'uppercase-message',
            items_in: { doc_count: 0, sum: { value: 0 } },
            duration: { doc_count: 2, sum: { value: 0.001 } },
          },
        ],
      },
    }).get('uppercase-message');

    expect(result).toEqual(noProcessorStats());
  });

  it('keeps the average null when items exist without duration documents', () => {
    const [first] = bucket().by_id.buckets;
    const result = map({
      by_id: { buckets: [{ ...first, duration: { doc_count: 0, sum: { value: 0 } } }] },
    }).get('uppercase-message');

    expect(result?.processing_duration.average).toEqual({ value: null, unit: null });
    expect(result?.events.incoming.rate.value).toBe(30 / seconds);
  });

  it('reports a failures rate of zero when items exist and none failed', () => {
    const [first] = bucket().by_id.buckets;
    const result = map({
      by_id: {
        buckets: [{ ...first, items_in: { doc_count: 4, sum: { value: 30 } } }],
      },
    }).get('uppercase-message');

    expect(result?.events.incoming.failures.rate).toEqual({
      value: 0,
      unit: '{item}',
      time_unit: 's',
    });
  });

  it('leaves the rates null when no time is covered', () => {
    const result = mapProcessorStatsResponse({
      aggregations: bucket(),
      seconds: undefined,
    }).get('uppercase-message');

    expect(result?.events.incoming.rate.value).toBeNull();
    expect(result?.events.incoming.failures.rate.value).toBeNull();
  });
});
