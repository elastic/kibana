/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT, MAX_FAILURE_COLLECTIONS, RATE_TIME_UNIT, STATS_COLUMN } from '../constants';
import { numberOrNull, type EsqlRow } from './esql_rows';

export type StatsValue = StreamsUnit.StatsDestinationResult['latency']['average'];
export type StatsRate = StreamsUnit.StatsDestinationResult['events']['incoming']['rate'];
export type StatsFailureRate =
  StreamsUnit.StatsDestinationResult['events']['failed']['authentication'];

/** A leaf always has its unit. A null value means no data. */
export const toValue = (value: number | null, unit: string): StatsValue => ({ value, unit });

/** A rate of items per second. */
export const toItemRate = (value: number | null): StatsRate => ({
  value,
  unit: ITEM_UNIT,
  time_unit: RATE_TIME_UNIT,
});

/**
 * The failure rate of one status: the total, and the rate of each collection that has failures of
 * it, read from `column` of the collection rows. A collection with a null or zero rate is left out.
 * The ones with the highest rates stay, at most `MAX_FAILURE_COLLECTIONS`, highest first.
 * `collections` is missing when none is left.
 */
export const toFailureRate = ({
  rate,
  collectionRows,
  column,
}: {
  rate: number | null;
  collectionRows: EsqlRow[];
  column: string;
}): StatsFailureRate => {
  const collections = collectionRows
    .flatMap((row) => {
      const name = row[STATS_COLUMN.collection];
      const collectionRate = numberOrNull(row[column]);
      return typeof name === 'string' && collectionRate !== null && collectionRate > 0
        ? [{ name, rate: collectionRate }]
        : [];
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, MAX_FAILURE_COLLECTIONS);

  return collections.length > 0
    ? {
        rate: toItemRate(rate),
        collections: Object.fromEntries(
          collections.map(({ name, rate: collectionRate }) => [
            name,
            { rate: toItemRate(collectionRate) },
          ])
        ),
      }
    : { rate: toItemRate(rate) };
};

/**
 * The series of a destination from its sums rows, and the total of its points, so the total
 * always agrees with the bars. A row with no items is left out. No points means no total.
 */
export const toSeries = ({
  rows,
  bucketMs,
}: {
  rows: EsqlRow[];
  bucketMs: number;
}): { series: StreamsUnit.StatsSeries; total: number | null } => {
  const points = rows.flatMap((row) => {
    const value = numberOrNull(row[STATS_COLUMN.sumItems]);
    return value === null ? [] : [{ start: String(row[STATS_COLUMN.bucket]), value }];
  });

  return {
    series: { bucket_ms: bucketMs, points },
    total: points.length > 0 ? points.reduce((sum, point) => sum + point.value, 0) : null,
  };
};
