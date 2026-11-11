/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT, SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { groupById, indexById, numberOrNull, type EsqlRow, type EsqlValue } from './esql_rows';
import { toFailureRate, toItemRate, toSeries, toValue } from './stats_values';

type AuthFailureStats = Pick<
  StreamsUnit.StatsDestinationResult['events']['failed'],
  'authentication' | 'authorization'
>;

/**
 * The authentication and authorization failures of a destination that has no data for them, or
 * whose type does not report them.
 */
export const noAuthFailures = (): AuthFailureStats => ({
  authentication: { rate: toItemRate(null) },
  authorization: { rate: toItemRate(null) },
});

export const noDestinationStats = (bucketMs: number): StreamsUnit.StatsDestinationResult => ({
  latency: { average: toValue(null, SECONDS_UNIT) },
  events: {
    incoming: {
      total: toValue(null, ITEM_UNIT),
      rate: toItemRate(null),
      series: { bucket_ms: bucketMs, points: [] },
    },
    failed: { rate: toItemRate(null), ...noAuthFailures() },
  },
});

/**
 * What the destination queries return for one destination. `failureCollections` has one row per
 * collection with 401 or 403 failures, and is missing when that query did not run for the
 * destination.
 */
export interface DestinationRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.authenticationRate]?: EsqlValue;
  [STATS_COLUMN.authorizationRate]?: EsqlValue;
  [STATS_COLUMN.avgLatency]?: EsqlValue;
  series: EsqlRow[];
  failureCollections?: EsqlRow[];
}

/**
 * Joins the rows of the rate query, of the sums query and of the failure collections query on the
 * destination id, into one object per destination. A destination is there when the sums query has
 * rows for it (it has items in the window). The series keeps the order of the rows, which the query
 * sorts by bucket. The failure collections rows are only for the destinations that have failures,
 * so a destination without them has no `failureCollections`.
 */
export const joinDestinationRows = ({
  rateRows,
  sumsRows,
  failureCollectionsRows = [],
}: {
  rateRows: EsqlRow[];
  sumsRows: EsqlRow[];
  failureCollectionsRows?: EsqlRow[];
}): Record<string, DestinationRow> => {
  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const seriesById = groupById(sumsRows, STATS_COLUMN.id);
  const failureCollectionsById = groupById(failureCollectionsRows, STATS_COLUMN.id);

  return Object.fromEntries(
    Object.entries(seriesById).map(([id, series]) => [
      id,
      {
        ...ratesById[id],
        series,
        ...(Object.hasOwn(failureCollectionsById, id)
          ? { failureCollections: failureCollectionsById[id] }
          : {}),
      },
    ])
  );
};

/**
 * Places the joined rows of each destination into its result. A column that ES|QL returned as
 * null stays no data. `total` is the sum of the points, so it always agrees with the bars.
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
              authentication: toFailureRate({
                rate: numberOrNull(row[STATS_COLUMN.authenticationRate]),
                collectionRows: row.failureCollections ?? [],
                column: STATS_COLUMN.authenticationRate,
              }),
              authorization: toFailureRate({
                rate: numberOrNull(row[STATS_COLUMN.authorizationRate]),
                collectionRows: row.failureCollections ?? [],
                column: STATS_COLUMN.authorizationRate,
              }),
            },
          },
        },
      ];
    })
  );
