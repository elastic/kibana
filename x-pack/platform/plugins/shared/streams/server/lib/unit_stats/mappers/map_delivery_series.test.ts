/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITEM_UNIT, STATS_COLUMN } from '../constants';
import type { EsqlRow } from './esql_rows';
import { noDestinationStats } from './map_destination_stats_result';
import { mapDeliverySeries, noDeliverySeries, withDeliverySeries } from './map_delivery_series';

const BUCKET_MS = 60_000;

const row = (
  id: string,
  bucket: string,
  counts: {
    total?: number | null;
    failed?: number | null;
    authentication?: number | null;
    authorization?: number | null;
  }
): EsqlRow => ({
  [STATS_COLUMN.id]: id,
  [STATS_COLUMN.bucket]: bucket,
  [STATS_COLUMN.totalItems]: counts.total ?? null,
  [STATS_COLUMN.failedItems]: counts.failed ?? null,
  [STATS_COLUMN.authenticationItems]: counts.authentication ?? null,
  [STATS_COLUMN.authorizationItems]: counts.authorization ?? null,
});

const map = (rows: EsqlRow[]) => mapDeliverySeries({ rows, bucketMs: BUCKET_MS, unit: ITEM_UNIT });

describe('mapDeliverySeries', () => {
  it('maps the rows of a destination to points, in the order of the rows, with the bucket and the unit', () => {
    const result = map([
      row('es-dev', '2026-10-20T10:00:00.000Z', {
        total: 100,
        failed: 40,
        authentication: 10,
        authorization: 25,
      }),
      row('es-dev', '2026-10-20T10:01:00.000Z', { total: 80, failed: 0 }),
    ]);

    expect(result['es-dev']).toEqual({
      bucket_ms: BUCKET_MS,
      unit: ITEM_UNIT,
      points: [
        {
          start: '2026-10-20T10:00:00.000Z',
          total: 100,
          failed: 40,
          authentication: 10,
          authorization: 25,
        },
        {
          start: '2026-10-20T10:01:00.000Z',
          total: 80,
          failed: 0,
          authentication: 0,
          authorization: 0,
        },
      ],
    });
  });

  it('counts a null as 0, because no items of that kind in a bucket is none', () => {
    const [point] = map([row('es-dev', '2026-10-20T10:00:00.000Z', { total: 50 })])['es-dev']
      .points;

    expect(point).toEqual({
      start: '2026-10-20T10:00:00.000Z',
      total: 50,
      failed: 0,
      authentication: 0,
      authorization: 0,
    });
  });

  it('keeps a bucket that has failures and no total, as when only failure store rows are in it', () => {
    const [point] = map([row('es-dev', '2026-10-20T10:00:00.000Z', { failed: 3 })])['es-dev']
      .points;

    expect(point).toEqual(expect.objectContaining({ total: 0, failed: 3 }));
  });

  it('leaves out a row with no items of any kind', () => {
    expect(map([row('es-dev', '2026-10-20T10:00:00.000Z', {})])['es-dev'].points).toEqual([]);
  });

  it('keeps the series of each destination apart, and has none for a destination with no rows', () => {
    const result = map([
      row('es-prod', '2026-10-20T10:00:00.000Z', { total: 10 }),
      row('es-dev', '2026-10-20T10:00:00.000Z', { total: 20 }),
      row('es-prod', '2026-10-20T10:01:00.000Z', { total: 30 }),
    ]);

    expect(Object.keys(result).sort()).toEqual(['es-dev', 'es-prod']);
    expect(result['es-prod'].points.map(({ total }) => total)).toEqual([10, 30]);
    expect(result['es-dev'].points.map(({ total }) => total)).toEqual([20]);
    expect(result['es-staging']).toBeUndefined();
  });

  it('does not read a destination named after a member of the prototype from it', () => {
    const result = map([row('constructor', '2026-10-20T10:00:00.000Z', { total: 1 })]);

    expect(Object.keys(result)).toEqual(['constructor']);
    expect(Object.values(result)[0].points).toHaveLength(1);
    expect(map([])).toEqual({});
  });
});

describe('noDeliverySeries', () => {
  it('has no points, with the bucket and the unit that were asked for', () => {
    expect(noDeliverySeries({ bucketMs: BUCKET_MS, unit: ITEM_UNIT })).toEqual({
      bucket_ms: BUCKET_MS,
      unit: ITEM_UNIT,
      points: [],
    });
  });
});

describe('withDeliverySeries', () => {
  it('adds the series to the result of the destination and changes nothing else', () => {
    const result = noDestinationStats(BUCKET_MS);
    const series = noDeliverySeries({ bucketMs: BUCKET_MS, unit: ITEM_UNIT });

    expect(withDeliverySeries(result, series)).toEqual({
      ...result,
      events: { ...result.events, delivery: { series } },
    });
  });

  it('leaves a result that was not asked for a series without one', () => {
    expect(noDestinationStats(BUCKET_MS).events.delivery).toBeUndefined();
  });
});
