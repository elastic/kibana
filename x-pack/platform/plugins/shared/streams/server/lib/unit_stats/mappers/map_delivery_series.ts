/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { STATS_COLUMN } from '../constants';
import { groupById, numberOrNull, type EsqlRow } from './esql_rows';

/**
 * The delivery series of a destination that was asked for one and has nothing in it: no points, so
 * "nothing found" differs from "not asked", which has no series at all.
 */
export const noDeliverySeries = ({
  bucketMs,
  unit,
}: {
  bucketMs: number;
  unit: string;
}): StreamsUnit.StatsDeliverySeries => ({ bucket_ms: bucketMs, unit, points: [] });

/**
 * The delivery series of each destination in the rows of a delivery series query, which has one row
 * per destination and bucket, sorted by bucket. A column that is null counts as 0, because no items
 * of that kind in a bucket is none, not unknown. A row with no items of any kind is left out, so a
 * bucket with no attempts has no point. A destination with no rows is not in the result.
 */
export const mapDeliverySeries = ({
  rows,
  bucketMs,
  unit,
}: {
  rows: EsqlRow[];
  bucketMs: number;
  unit: string;
}): Record<string, StreamsUnit.StatsDeliverySeries> =>
  Object.fromEntries(
    Object.entries(groupById(rows, STATS_COLUMN.id)).map(([id, destinationRows]) => [
      id,
      {
        bucket_ms: bucketMs,
        unit,
        points: destinationRows.flatMap((row) => {
          const counts = {
            total: numberOrNull(row[STATS_COLUMN.totalItems]),
            failed: numberOrNull(row[STATS_COLUMN.failedItems]),
            authentication: numberOrNull(row[STATS_COLUMN.authenticationItems]),
            authorization: numberOrNull(row[STATS_COLUMN.authorizationItems]),
          };
          if (Object.values(counts).every((count) => count === null)) return [];

          return [
            {
              start: String(row[STATS_COLUMN.bucket]),
              total: counts.total ?? 0,
              failed: counts.failed ?? 0,
              authentication: counts.authentication ?? 0,
              authorization: counts.authorization ?? 0,
            },
          ];
        }),
      },
    ])
  );

/** The result of a destination with its delivery series, which only a request that asks has. */
export const withDeliverySeries = (
  result: StreamsUnit.StatsDestinationResult,
  series: StreamsUnit.StatsDeliverySeries
): StreamsUnit.StatsDestinationResult => ({
  ...result,
  events: { ...result.events, delivery: { series } },
});
