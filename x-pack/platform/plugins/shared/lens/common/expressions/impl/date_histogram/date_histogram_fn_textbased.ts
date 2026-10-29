/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService, ParsedInterval } from '@kbn/data-plugin/common';
import { parseEsInterval } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment-timezone';
import type { DateHistogramTextBasedExpressionFunction } from '../../defs/date_histogram/types';

function offsetMs(timestamp: number, timeZone: string): number {
  return moment.tz(timestamp, timeZone).utcOffset() * 60 * 1000;
}

function fixedIntervalMs(interval: ParsedInterval): number {
  return moment.duration(interval.value, interval.unit).asMilliseconds();
}

/**
 * Timezone offset shifts UTC onto a local timeline so `floor(t / interval)`
 * lands on local midnights/hours. Subtracting the offset at the result converts
 * back to UTC (the destination offset can differ across DST).
 *
 * bucket_key = floor((value + offset) / interval) * interval - offset
 *
 * @see https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation#time-zone
 */
function snapToEsBucket(timestamp: number, interval: ParsedInterval, timeZone: string): number {
  if (interval.type === 'calendar') {
    return moment.tz(timestamp, timeZone).startOf(interval.unit).valueOf();
  }

  const intervalMs = fixedIntervalMs(interval);
  const local = timestamp + offsetMs(timestamp, timeZone);
  const snapped = Math.floor(local / intervalMs) * intervalMs;
  return snapped - offsetMs(snapped, timeZone);
}

function addInterval(timestamp: number, interval: ParsedInterval, timeZone: string): number {
  if (interval.type === 'calendar') {
    return moment.tz(timestamp, timeZone).add(interval.value, interval.unit).valueOf();
  }

  const intervalMs = fixedIntervalMs(interval);
  const local = timestamp + offsetMs(timestamp, timeZone);
  const next = Math.floor(local / intervalMs) * intervalMs + intervalMs;
  return next - offsetMs(next, timeZone);
}

const isFullyContained = (
  bucketStart: number,
  from: number,
  to: number,
  interval: ParsedInterval,
  timeZone: string
): boolean => bucketStart >= from && addInterval(bucketStart, interval, timeZone) <= to;

/**
 * Builds the histogram domain from the applied time range and interval.
 * Bounds are snapped independently so the grid does not depend on row order or
 * break when the range crosses a DST transition.
 */
const getDomainBounds = (
  from: number,
  to: number,
  interval: ParsedInterval,
  timeZone: string,
  dropPartials: boolean
): { min: number; max: number } | undefined => {
  let min = snapToEsBucket(from, interval, timeZone);
  let max = snapToEsBucket(to, interval, timeZone);

  if (dropPartials) {
    if (!isFullyContained(min, from, to, interval, timeZone)) {
      min = addInterval(min, interval, timeZone);
    }
    if (!isFullyContained(max, from, to, interval, timeZone)) {
      max = snapToEsBucket(max - 1, interval, timeZone);
    }
    if (min > max) {
      return undefined;
    }
  }

  return { min, max };
};

/**
 * Prepares an ES|QL date histogram for the XY chart. Tables
 * without a date histogram column are returned unchanged.
 */
export const dateHistogramTextBasedFn =
  (
    getDatatableUtilities: (
      context: ExecutionContext
    ) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>,
    getTimezone: (context: ExecutionContext) => string | Promise<string>
  ): DateHistogramTextBasedExpressionFunction['fn'] =>
  async (input, _args, context) => {
    const column = input.columns.find((c) => {
      return c.meta?.esType === 'date' && c.meta?.esMeta?.bucket !== undefined;
    });

    if (!column) {
      return input;
    }

    const contextTimeZone = await getTimezone(context);
    const datatableUtilities = await getDatatableUtilities(context);

    const meta = datatableUtilities.getDateHistogramMeta(column, {
      timeZone: contextTimeZone,
    });

    if (!meta) {
      return input;
    }

    const { interval: intervalString, timeRange } = meta;

    if (!intervalString || !timeRange) {
      return input;
    }

    // ES|QL date histograms drop partial buckets by default: undefined is treated as true, an explicit false is respected.
    const dropPartials = meta.dropPartials ?? true;

    // Bucket boundaries must match the timezone ES|QL BUCKET uses so calendar intervals stay aligned.
    const timeZone = meta.timeZone || contextTimeZone;

    let interval: ParsedInterval;
    try {
      interval = parseEsInterval(intervalString);
    } catch {
      return input;
    }

    const from = moment.tz(timeRange.from, timeZone).valueOf();
    const to = moment.tz(timeRange.to, timeZone).valueOf();

    const computedDomain = getDomainBounds(from, to, interval, timeZone, dropPartials);

    const columns = computedDomain
      ? input.columns.map((current) =>
          current.id === column.id
            ? {
                ...current,
                meta: {
                  ...current.meta,
                  sourceParams: { ...current.meta.sourceParams, computedDomain },
                },
              }
            : current
        )
      : input.columns;

    if (!dropPartials || input.rows.length === 0) {
      return { ...input, columns };
    }

    return {
      ...input,
      columns,
      rows: input.rows.filter((row) => {
        const bucketStart = row[column.id];
        return (
          (typeof bucketStart !== 'string' && typeof bucketStart !== 'number') ||
          isFullyContained(moment.tz(bucketStart, timeZone).valueOf(), from, to, interval, timeZone)
        );
      }),
    };
  };
