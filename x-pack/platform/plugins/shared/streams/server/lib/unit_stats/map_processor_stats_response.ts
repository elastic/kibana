/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { SECONDS_UNIT } from './constants';
import { noRate, noValue, perSecond, toItemRate, toValue } from './stats_values';

interface ProcessorBucket {
  key: string;
  items_in?: {
    doc_count: number;
    sum?: { value: number | null };
    failures?: { doc_count: number; sum?: { value: number | null } };
  };
  duration?: { doc_count: number; sum?: { value: number | null } };
}

export interface ProcessorStatsAggregations {
  by_id?: { buckets: ProcessorBucket[] };
}

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({
  processing_duration: { average: noValue() },
  events: { incoming: { rate: noRate(), failures: { rate: noRate() } } },
});

/**
 * Seconds per event: the duration sum over the items `in` sum. Isolated so the duration
 * math stays in one place and is easy to drop. Null when items `in` is zero or absent, or
 * when there is no duration sum.
 */
export const averageSecondsPerEvent = (
  durationSum: number | null | undefined,
  itemsIn: number | null | undefined
): number | null =>
  typeof durationSum === 'number' && typeof itemsIn === 'number' && itemsIn > 0
    ? durationSum / itemsIn
    : null;

/**
 * Maps aggregation buckets to results by processor id. A processor has data when an items
 * `in` document exists in the window. An id with no bucket is absent from the map, and the
 * caller keeps its null result. The one real zero is the failures rate when items exist
 * and none failed.
 */
export const mapProcessorStatsResponse = ({
  aggregations,
  seconds,
}: {
  aggregations: ProcessorStatsAggregations | undefined;
  seconds: number | undefined;
}): Map<string, StreamsUnit.StatsProcessorResult> => {
  const results = new Map<string, StreamsUnit.StatsProcessorResult>();

  for (const bucket of aggregations?.by_id?.buckets ?? []) {
    const result = noProcessorStats();
    const { items_in: itemsIn, duration } = bucket;

    if (itemsIn && itemsIn.doc_count > 0) {
      const incoming = itemsIn.sum?.value ?? 0;
      result.events.incoming.rate = toItemRate(perSecond(incoming, seconds));
      result.events.incoming.failures.rate = toItemRate(
        perSecond(itemsIn.failures?.sum?.value ?? 0, seconds)
      );
      if (duration && duration.doc_count > 0) {
        result.processing_duration.average = toValue(
          averageSecondsPerEvent(duration.sum?.value, incoming),
          SECONDS_UNIT
        );
      }
    }

    results.set(String(bucket.key), result);
  }

  return results;
};
