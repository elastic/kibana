/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT, REQUEST_UNIT, SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { groupById, indexById, numberOrNull, type EsqlRow, type EsqlValue } from './esql_rows';
import { toItemRate, toPercentage, toRate, toSeries, toValue } from './stats_values';

type FailedStats = StreamsUnit.StatsDestinationResult['events']['failed'];

/**
 * What a destination type reports about its failures: the two classes, and optionally its own
 * total of failures, for a type that counts them in another unit than the items of the totals
 * query (S3 counts upload attempts).
 */
export type AuthFailureStats = Pick<FailedStats, 'authentication' | 'authorization'> & {
  failed?: Pick<FailedStats, 'rate' | 'percentage'>;
};

/**
 * The authentication and authorization failures of a destination that has no data for them, or
 * whose type does not report them.
 */
export const noAuthFailures = (): AuthFailureStats => ({
  authentication: { rate: toItemRate(null), percentage: toPercentage(null, null) },
  authorization: { rate: toItemRate(null), percentage: toPercentage(null, null) },
});

/**
 * The same for an S3 destination, whose failures are upload attempts, not items. It also has the
 * total of failures, which replaces the items-based one of the totals query: items fail late, so
 * that rate must not stand in when the attempts could not be read.
 */
export const noS3AuthFailures = (): AuthFailureStats => ({
  failed: { rate: toRate(null, REQUEST_UNIT), percentage: toPercentage(null, null) },
  authentication: { rate: toRate(null, REQUEST_UNIT), percentage: toPercentage(null, null) },
  authorization: { rate: toRate(null, REQUEST_UNIT), percentage: toPercentage(null, null) },
});

export const noDestinationStats = (bucketMs: number): StreamsUnit.StatsDestinationResult => ({
  latency: { average: toValue(null, SECONDS_UNIT) },
  events: {
    incoming: {
      total: toValue(null, ITEM_UNIT),
      rate: toItemRate(null),
      series: { bucket_ms: bucketMs, points: [] },
    },
    failed: {
      rate: toItemRate(null),
      percentage: toPercentage(null, null),
      ...noAuthFailures(),
    },
  },
});

/**
 * The result of a destination, with its authentication and authorization failures. The total of
 * failures that its type reports, when it reports one, replaces the one of the totals query.
 */
export const withAuthFailures = (
  result: StreamsUnit.StatsDestinationResult,
  { failed, ...classes }: AuthFailureStats
): StreamsUnit.StatsDestinationResult => ({
  ...result,
  events: { ...result.events, failed: { ...result.events.failed, ...failed, ...classes } },
});

/** What the two destination queries return for one destination. */
export interface DestinationRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.avgLatency]?: EsqlValue;
  series: EsqlRow[];
}

/**
 * Joins the rows of the rate query and of the sums query on the destination id, into one object
 * per destination. A destination is there when either query has rows for it, so one with no items
 * in the window still has its latency: a destination that fails every attempt may report no items
 * until its retries end. Its series is empty. The series keeps the order of the rows, which the
 * query sorts by bucket.
 */
export const joinDestinationRows = ({
  rateRows,
  sumsRows,
}: {
  rateRows: EsqlRow[];
  sumsRows: EsqlRow[];
}): Record<string, DestinationRow> => {
  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const seriesById = groupById(sumsRows, STATS_COLUMN.id);

  const ids = new Set([...Object.keys(ratesById), ...Object.keys(seriesById)]);

  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      { ...ratesById[id], series: Object.hasOwn(seriesById, id) ? seriesById[id] : [] },
    ])
  );
};

/**
 * Places the joined rows of each destination into its result. A column that ES|QL returned as
 * null stays no data. `total` is the sum of the points, so it always agrees with the bars. The
 * authentication and authorization failures are not read here: the queries of the destination's
 * type give them, see `withAuthFailures`.
 */
export const mapDestinationStatsRows = ({
  rows,
  bucketMs,
}: {
  rows: Record<string, DestinationRow>;
  bucketMs: number;
}): Record<string, StreamsUnit.StatsDestinationResult> =>
  Object.fromEntries(
    Object.entries(rows).map(([id, row]) => {
      const { series, total } = toSeries({ rows: row.series, bucketMs });

      return [
        id,
        {
          latency: {
            average: toValue(numberOrNull(row[STATS_COLUMN.avgLatency]), SECONDS_UNIT),
          },
          events: {
            incoming: {
              total: toValue(total, ITEM_UNIT),
              rate: toItemRate(numberOrNull(row[STATS_COLUMN.incomingRate])),
              series,
            },
            failed: {
              rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])),
              percentage: toPercentage(
                numberOrNull(row[STATS_COLUMN.failedRate]),
                numberOrNull(row[STATS_COLUMN.incomingRate])
              ),
              ...noAuthFailures(),
            },
          },
        },
      ];
    })
  );
