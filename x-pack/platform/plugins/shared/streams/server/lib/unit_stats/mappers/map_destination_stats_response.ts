/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { ITEM_UNIT, SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { numberOrNull } from './esql_rows';
import type { DestinationRow } from './join_destination_rows';
import { noRate, noValue, toItemRate, toSeries, toValue } from './stats_values';

export const noDestinationStats = (bucketMs: number): StreamsUnit.StatsDestinationResult => ({
  latency: { average: noValue() },
  events: {
    incoming: {
      total: noValue(),
      rate: noRate(),
      series: { bucket_ms: bucketMs, points: [] },
      failures: { rate: noRate() },
    },
  },
});

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
              failures: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
            },
          },
        },
      ];
    })
  );
