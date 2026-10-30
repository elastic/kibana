/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService, ParsedInterval } from '@kbn/data-plugin/common';
import { InvalidEsCalendarIntervalError, parseEsInterval } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment-timezone';
import type { DateHistogramTextBasedExpressionFunction } from '../../defs/date_histogram/types';

function offsetMs(timestamp: number, timeZone: string): number {
  return moment.tz(timestamp, timeZone).utcOffset() * 60 * 1000;
}

function utcToLocal(timestamp: number, timeZone: string): number {
  return timestamp + offsetMs(timestamp, timeZone);
}

function localToUtc(localMs: number, timeZone: string): number {
  const wallClock = moment.utc(localMs).format('YYYY-MM-DDTHH:mm:ss.SSS');
  return moment.tz(wallClock, timeZone).valueOf();
}

function fixedIntervalMs(interval: ParsedInterval): number {
  return moment.duration(interval.value, interval.unit).asMilliseconds();
}

function parseEsqlHistogramInterval(intervalString: string): ParsedInterval | undefined {
  try {
    return parseEsInterval(intervalString);
  } catch (error) {
    if (error instanceof InvalidEsCalendarIntervalError) {
      return { value: error.value, unit: error.unit, type: 'calendar' };
    }
    return undefined;
  }
}

function calendarMomentUnit(unit: ParsedInterval['unit']): moment.unitOfTime.DurationConstructor {
  return (unit === 'w' ? 'isoWeek' : unit) as moment.unitOfTime.DurationConstructor;
}

function calendarUnitIndex(value: moment.Moment, unit: ParsedInterval['unit']): number {
  switch (unit) {
    case 'w':
      return value.isoWeek() - 1;
    case 'M':
      return value.month();
    case 'y':
      return value.year();
    default:
      return 0;
  }
}

/**
 * Timezone offset shifts UTC onto a local timeline so `floor(t / interval)`
 * lands on local midnights/hours. The snapped local instant is then parsed
 * back as wall-clock time in the histogram timezone (the destination offset
 * can differ across DST).
 *
 * bucket_key = localToUtc(floor(utcToLocal(value) / interval) * interval)
 *
 * @see https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-datehistogram-aggregation#time-zone
 */
function snapToEsBucket(timestamp: number, interval: ParsedInterval, timeZone: string): number {
  if (interval.type === 'calendar') {
    const unit = calendarMomentUnit(interval.unit);
    const snapped = moment.tz(timestamp, timeZone).startOf(unit);
    if (interval.value > 1) {
      snapped.subtract(calendarUnitIndex(snapped, interval.unit) % interval.value, unit);
    }
    return snapped.valueOf();
  }

  const intervalMs = fixedIntervalMs(interval);
  const snappedLocal = Math.floor(utcToLocal(timestamp, timeZone) / intervalMs) * intervalMs;
  return localToUtc(snappedLocal, timeZone);
}

function addInterval(timestamp: number, interval: ParsedInterval, timeZone: string): number {
  if (interval.type === 'calendar') {
    return moment
      .tz(timestamp, timeZone)
      .add(interval.value, calendarMomentUnit(interval.unit))
      .valueOf();
  }

  const intervalMs = fixedIntervalMs(interval);
  const nextLocal =
    Math.floor(utcToLocal(timestamp, timeZone) / intervalMs) * intervalMs + intervalMs;
  return localToUtc(nextLocal, timeZone);
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

    const interval = parseEsqlHistogramInterval(intervalString);
    if (!interval) {
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
