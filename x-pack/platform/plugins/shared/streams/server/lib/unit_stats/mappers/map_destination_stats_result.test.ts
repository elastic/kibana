/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsDestinationResultSchema } from '@kbn/streams-schema';
import { MAX_FAILURE_COLLECTIONS } from '../constants';
import {
  joinDestinationRows,
  mapDestinationStatsRows,
  type DestinationRow,
} from './map_destination_stats_result';

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
        },
        failed: {
          rate: { value: 0, unit: '{item}', time_unit: 's' },
          authentication: { rate: { value: null, unit: '{item}', time_unit: 's' } },
          authorization: { rate: { value: null, unit: '{item}', time_unit: 's' } },
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

    expect(result.latency.average).toEqual({ value: null, unit: 's' });
    expect(result.events.incoming.rate).toEqual({ value: null, unit: '{item}', time_unit: 's' });
    expect(result.events.failed.rate).toEqual({ value: null, unit: '{item}', time_unit: 's' });
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

describe('mapDestinationStatsRows failure rates', () => {
  const series = [{ bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 }];
  const rate = (value: number | null) => ({ value, unit: '{item}', time_unit: 's' });

  /** Maps one destination, and checks that the result still parses with the response schema. */
  const mapFailed = (row: Partial<DestinationRow>) => {
    const result = mapDestinationStatsRows({
      rows: { 'es-prod': { incoming_rate: 4.6, failed_rate: 0, series, ...row } },
      bucketMs,
    })['es-prod'];
    expect(streamsUnitStatsDestinationResultSchema.parse(result)).toEqual(result);

    return result.events.failed;
  };

  it('has no data for a destination whose rates are null', () => {
    const failed = mapFailed({ authentication_rate: null, authorization_rate: null });

    expect(failed.authentication).toEqual({ rate: rate(null) });
    expect(failed.authorization).toEqual({ rate: rate(null) });
  });

  it('has a rate of 0 and no collections for a destination with items and no rejection', () => {
    const failed = mapFailed({ authentication_rate: 0, authorization_rate: 0 });

    expect(failed.authentication).toEqual({ rate: rate(0) });
    expect(failed.authorization).toEqual({ rate: rate(0) });
  });

  it('reports a 401 total with no collections, because a whole request has none', () => {
    const failed = mapFailed({ authentication_rate: 2, authorization_rate: 0 });

    expect(failed.authentication).toEqual({ rate: rate(2) });
    expect(failed.authorization).toEqual({ rate: rate(0) });
  });

  it('reports 403 failures with their collections', () => {
    const failed = mapFailed({
      authentication_rate: 0,
      authorization_rate: 1.9,
      failureCollections: [
        {
          collection: 'logs-generic.otel-default',
          authentication_rate: null,
          authorization_rate: 1.9,
        },
      ],
    });

    expect(failed.authentication).toEqual({ rate: rate(0) });
    expect(failed.authorization).toEqual({
      rate: rate(1.9),
      collections: { 'logs-generic.otel-default': { rate: rate(1.9) } },
    });
  });

  it('leaves out a collection with no failures of a type, and lists no more than the total', () => {
    const failed = mapFailed({
      authentication_rate: 2.5,
      authorization_rate: 1,
      failureCollections: [
        { collection: 'logs-a-default', authentication_rate: 1.5, authorization_rate: 1 },
        { collection: 'logs-b-default', authentication_rate: 0.5, authorization_rate: null },
      ],
    });

    expect(Object.keys(failed.authentication.collections ?? {})).toEqual([
      'logs-a-default',
      'logs-b-default',
    ]);
    expect(Object.keys(failed.authorization.collections ?? {})).toEqual(['logs-a-default']);
    const collectionRates = Object.values(failed.authentication.collections ?? {}).map(
      ({ rate: { value } }) => value ?? 0
    );
    expect(collectionRates.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(
      failed.authentication.rate.value ?? NaN
    );
  });

  it('skips a row with no collection name', () => {
    const failed = mapFailed({
      authentication_rate: 2,
      authorization_rate: 0,
      failureCollections: [
        { collection: 'logs-a-default', authentication_rate: 1, authorization_rate: null },
        { collection: null, authentication_rate: 1, authorization_rate: null },
      ],
    });

    expect(failed.authentication).toEqual({
      rate: rate(2),
      collections: { 'logs-a-default': { rate: rate(1) } },
    });
  });

  it('keeps the collections with the highest rates, highest first, up to the cap', () => {
    const total = MAX_FAILURE_COLLECTIONS + 5;
    const failureCollections = Array.from({ length: total }, (_, index) => ({
      collection: `logs-c${index + 1}-default`,
      authentication_rate: index + 1,
      authorization_rate: null,
    }));

    const failed = mapFailed({
      authentication_rate: 1000,
      authorization_rate: 0,
      failureCollections,
    });
    const names = Object.keys(failed.authentication.collections ?? {});

    expect(names).toHaveLength(MAX_FAILURE_COLLECTIONS);
    expect(names[0]).toBe(`logs-c${total}-default`);
    expect(names[names.length - 1]).toBe(`logs-c${total - MAX_FAILURE_COLLECTIONS + 1}-default`);
  });
});

const rateRows = [
  { id: 'es-prod', incoming_rate: 4.6, failed_rate: 0, avg_latency: 0.18 },
  { id: 'es-dev', incoming_rate: 4.2, failed_rate: 0.5, avg_latency: 0.17 },
];

const sumsRows = [
  { id: 'es-prod', bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
  { id: 'es-prod', bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
  { id: 'es-dev', bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 },
];

describe('joinDestinationRows', () => {
  it('has one object per destination with its rates and series', () => {
    expect(joinDestinationRows({ rateRows, sumsRows })).toEqual({
      'es-prod': {
        incoming_rate: 4.6,
        failed_rate: 0,
        avg_latency: 0.18,
        series: [
          { bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
          { bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
        ],
      },
      'es-dev': {
        incoming_rate: 4.2,
        failed_rate: 0.5,
        avg_latency: 0.17,
        series: [{ bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 }],
      },
    });
  });

  it('leaves out a destination that has rates but no items in the window', () => {
    const shaped = joinDestinationRows({
      rateRows,
      sumsRows: sumsRows.filter(({ id }) => id === 'es-prod'),
    });

    expect(Object.keys(shaped)).toEqual(['es-prod']);
  });

  it('keeps the series of a destination that has no rate row', () => {
    const shaped = joinDestinationRows({ rateRows: [], sumsRows });

    expect(shaped['es-dev']).toEqual({
      series: [{ bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 }],
    });
  });

  it('attaches the failure collection rows only to the destination that has them', () => {
    const failureCollectionsRows = [
      {
        id: 'es-dev',
        collection: 'logs-a-default',
        authentication_rate: 0.5,
        authorization_rate: null,
      },
    ];

    const shaped = joinDestinationRows({ rateRows, sumsRows, failureCollectionsRows });

    expect(shaped['es-dev'].failureCollections).toEqual([
      { collection: 'logs-a-default', authentication_rate: 0.5, authorization_rate: null },
    ]);
    expect(shaped['es-prod']).not.toHaveProperty('failureCollections');
  });

  it('has no destinations for no rows', () => {
    expect(joinDestinationRows({ rateRows: [], sumsRows: [] })).toEqual({});
  });
});
