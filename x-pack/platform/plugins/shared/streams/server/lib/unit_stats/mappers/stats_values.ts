/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import {
  ITEM_UNIT,
  MAX_FAILURE_BREAKDOWN_ENTRIES,
  RATE_TIME_UNIT,
  STATS_COLUMN,
} from '../constants';
import { numberOrNull, stringOrNull, type EsqlRow } from './esql_rows';

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
 * The failure rate of one class: the rate of the destination, and its breakdown by cause, one entry
 * for each row of `breakdownRows` that has a collection or a reason and a rate above zero in
 * `column`. The collection and the reason are null when the row has none. The entries with the
 * highest rates stay, at most `MAX_FAILURE_BREAKDOWN_ENTRIES`, highest first. `breakdown` is
 * missing when no entry is left.
 */
export const toFailureRate = ({
  rate,
  breakdownRows,
  column,
}: {
  rate: number | null;
  breakdownRows: EsqlRow[];
  column: string;
}): StatsFailureRate => {
  const breakdown = breakdownRows
    .flatMap((row) => {
      const collection = stringOrNull(row[STATS_COLUMN.collection]);
      const reason = stringOrNull(row[STATS_COLUMN.reason]);
      const causeRate = numberOrNull(row[column]);
      return causeRate !== null && causeRate > 0 && (collection !== null || reason !== null)
        ? [{ collection, reason, rate: causeRate }]
        : [];
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, MAX_FAILURE_BREAKDOWN_ENTRIES)
    .map(({ collection, reason, rate: causeRate }) => ({
      collection,
      reason,
      rate: toItemRate(causeRate),
    }));

  return breakdown.length > 0 ? { rate: toItemRate(rate), breakdown } : { rate: toItemRate(rate) };
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
