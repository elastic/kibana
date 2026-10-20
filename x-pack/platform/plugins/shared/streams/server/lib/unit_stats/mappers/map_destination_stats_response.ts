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
import { noRate, noValue, perSecond, toItemRate, toSeries, toValue } from './stats_values';

interface DestinationBucket {
  key: string;
  items?: {
    doc_count: number;
    sum?: { value: number | null };
    series?: { buckets: Array<{ key: number; doc_count: number; sum?: { value: number | null } }> };
    failures?: { doc_count: number; sum?: { value: number | null } };
  };
  duration?: { doc_count: number; average?: { value: number | null } };
}

export interface DestinationStatsAggregations {
  by_id?: { buckets: DestinationBucket[] };
}

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
 * Maps aggregation buckets to results by destination id. A destination has data when an
 * items document exists in the window. An id with no bucket is absent from the map, and
 * the caller keeps its null result. The mapper never invents a zero: the one real zero is
 * the failures rate when items exist and none failed. `total` is the sum of the points,
 * so it always agrees with the bars.
 */
export const mapDestinationStatsResponse = ({
  aggregations,
  seconds,
  bucketMs,
}: {
  aggregations: DestinationStatsAggregations | undefined;
  seconds: number | undefined;
  bucketMs: number;
}): Map<string, StreamsUnit.StatsDestinationResult> => {
  const results = new Map<string, StreamsUnit.StatsDestinationResult>();

  for (const bucket of aggregations?.by_id?.buckets ?? []) {
    const result = noDestinationStats(bucketMs);
    const { items, duration } = bucket;

    if (duration && duration.doc_count > 0 && typeof duration.average?.value === 'number') {
      result.latency.average = toValue(duration.average.value, SECONDS_UNIT);
    }

    if (items && items.doc_count > 0) {
      const points = (items.series?.buckets ?? [])
        .filter((point) => point.doc_count > 0)
        .map((point) => ({
          start: new Date(point.key).toISOString(),
          value: point.sum?.value ?? 0,
        }));
      const total = points.reduce((sum, point) => sum + point.value, 0);
      result.events.incoming = {
        total: toValue(total, ITEM_UNIT),
        rate: toItemRate(perSecond(total, seconds)),
        series: { bucket_ms: bucketMs, points },
        failures: { rate: toItemRate(perSecond(items.failures?.sum?.value ?? 0, seconds)) },
      };
    }

    results.set(String(bucket.key), result);
  }

  return results;
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
              failures: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
            },
          },
        },
      ];
    })
  );
