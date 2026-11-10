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
      authentication: { rate: toItemRate(null) },
      authorization: { rate: toItemRate(null) },
    },
  },
});

/**
 * What the destination queries return for one destination. `failureSignals` has one row per signal
 * with 401 or 403 failures, and is missing when that query did not run for the destination.
 */
export interface DestinationRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.authenticationRate]?: EsqlValue;
  [STATS_COLUMN.authorizationRate]?: EsqlValue;
  [STATS_COLUMN.avgLatency]?: EsqlValue;
  series: EsqlRow[];
  failureSignals?: EsqlRow[];
}

/**
 * Joins the rows of the rate query, of the sums query and of the failure signals query on the
 * destination id, into one object per destination. A destination is there when the sums query has
 * rows for it (it has items in the window). The series keeps the order of the rows, which the query
 * sorts by bucket. The failure signals rows are only for the destinations that have failures, so
 * a destination without them has no `failureSignals`.
 */
export const joinDestinationRows = ({
  rateRows,
  sumsRows,
  failureSignalsRows = [],
}: {
  rateRows: EsqlRow[];
  sumsRows: EsqlRow[];
  failureSignalsRows?: EsqlRow[];
}): Record<string, DestinationRow> => {
  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const seriesById = groupById(sumsRows, STATS_COLUMN.id);
  const failureSignalsById = groupById(failureSignalsRows, STATS_COLUMN.id);

  return Object.fromEntries(
    Object.entries(seriesById).map(([id, series]) => [
      id,
      {
        ...ratesById[id],
        series,
        ...(Object.hasOwn(failureSignalsById, id)
          ? { failureSignals: failureSignalsById[id] }
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
                signalRows: row.failureSignals ?? [],
                column: STATS_COLUMN.authenticationRate,
              }),
              authorization: toFailureRate({
                rate: numberOrNull(row[STATS_COLUMN.authorizationRate]),
                signalRows: row.failureSignals ?? [],
                column: STATS_COLUMN.authorizationRate,
              }),
            },
          },
        },
      ];
    })
  );
