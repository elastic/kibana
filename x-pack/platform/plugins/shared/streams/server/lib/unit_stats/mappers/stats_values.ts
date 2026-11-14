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
  PERCENT_UNIT,
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

/** A rate per second of what `unit` counts. */
export const toRate = (value: number | null, unit: string): StatsRate => ({
  value,
  unit,
  time_unit: RATE_TIME_UNIT,
});

/**
 * The share of `whole` that `part` is, in percent. Both are rates of the same unit over the same
 * time, so the share of the rates is the share of the counts. No data on either side, or a `whole`
 * that is not above zero, has no share: null, never a division by zero. It is not capped at 100, so
 * a part larger than its whole shows as a wrong number and not as a hidden one.
 */
export const toPercentage = (part: number | null, whole: number | null): StatsValue =>
  toValue(part !== null && whole !== null && whole > 0 ? (part / whole) * 100 : null, PERCENT_UNIT);

/** A rate of items per second. */
export const toItemRate = (value: number | null): StatsRate => toRate(value, ITEM_UNIT);

/**
 * The failure rate of one class: the rate of the destination, and its breakdown by cause, one entry
 * for each row of `breakdownRows` that has a collection or a reason and a rate above zero in
 * `column`. The collection and the reason are null when the row has none. The entries with the
 * highest rates stay, at most `MAX_FAILURE_BREAKDOWN_ENTRIES`, highest first. `breakdown` is
 * missing when no entry is left.
 *
 * The `unit` says what the rates count, items unless the destination type reports its failures
 * another way. Every rate of one failure rate has the same unit. `attempts` is the rate of all that
 * the destination attempted, in the same unit, and every percentage is the share of it: the class
 * and each entry of the breakdown, so the entries add up to the class and not to 100.
 */
export const toFailureRate = ({
  rate,
  attempts,
  breakdownRows,
  column,
  unit = ITEM_UNIT,
}: {
  rate: number | null;
  attempts: number | null;
  breakdownRows: EsqlRow[];
  column: string;
  unit?: string;
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
      rate: toRate(causeRate, unit),
      percentage: toPercentage(causeRate, attempts),
    }));

  const failureRate = { rate: toRate(rate, unit), percentage: toPercentage(rate, attempts) };

  return breakdown.length > 0 ? { ...failureRate, breakdown } : failureRate;
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
