/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { DateRounding, IanaTimeZone } from '@kbn/es-date-rounding';
import {
  ianaTimeZoneOrUtc,
  nextBucketKey,
  roundToBucketKey,
  toDateRounding,
} from '@kbn/es-date-rounding';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment-timezone';
import type { DateHistogramTextBasedExpressionFunction } from '../../defs/date_histogram/types';

/**
 * Keys of the first and last buckets of the time range, rounded like ES|QL `BUCKET`.
 * With `dropPartials`, the buckets only partly inside the range are excluded.
 */
const getDomainBounds = (
  from: number,
  to: number,
  rounding: DateRounding,
  timeZone: IanaTimeZone,
  dropPartials: boolean
): { min: number; max: number } | undefined => {
  const firstKey = roundToBucketKey(from, rounding, timeZone);
  const lastKey = roundToBucketKey(to, rounding, timeZone);

  // Keys can go backward when a clock rollback repeats a date, so the endpoint keys are not
  // always chronological bounds.
  if (!dropPartials) {
    return firstKey <= lastKey ? { min: firstKey, max: lastKey } : undefined;
  }

  // The bucket containing `to` always extends past it, so the last full bucket is the one before.
  const min = firstKey < from ? nextBucketKey(firstKey, rounding, timeZone) : firstKey;
  const max = roundToBucketKey(lastKey - 1, rounding, timeZone);

  return min <= max ? { min, max } : undefined;
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

    const rounding = toDateRounding(intervalString);
    if (!rounding) {
      return input;
    }

    // ES|QL date histograms drop partial buckets by default: undefined is treated as true, an explicit false is respected.
    const dropPartials = meta.dropPartials ?? true;

    // Bucket boundaries must match the timezone ES|QL BUCKET uses so calendar intervals stay aligned.
    const timeZone = ianaTimeZoneOrUtc(meta.timeZone || contextTimeZone);

    // Moment reads a missing endpoint as now, which would clip bars against an invented bound.
    if (!timeRange.from || !timeRange.to) {
      return input;
    }

    const from = moment.tz(timeRange.from, timeZone).valueOf();
    const to = moment.tz(timeRange.to, timeZone).valueOf();

    // An unparseable endpoint cannot be rounded.
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return input;
    }

    const computedDomain = getDomainBounds(from, to, rounding, timeZone, dropPartials);

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
        if (typeof bucketStart !== 'string' && typeof bucketStart !== 'number') {
          return true;
        }
        const key = moment.tz(bucketStart, timeZone).valueOf();
        return (
          computedDomain !== undefined && key >= computedDomain.min && key <= computedDomain.max
        );
      }),
    };
  };
