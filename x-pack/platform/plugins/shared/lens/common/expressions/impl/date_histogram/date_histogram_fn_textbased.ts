/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { parseInterval, splitStringInterval } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment-timezone';
import type { DateHistogramTextBasedExpressionFunction } from '../../defs/date_histogram/types';

type Unit = NonNullable<ReturnType<typeof splitStringInterval>>['unit'];

const isFullyContained = (
  bucketStart: moment.Moment,
  from: moment.Moment,
  to: moment.Moment,
  step: number,
  unit: Unit
) => !bucketStart.isBefore(from) && !bucketStart.clone().add(step, unit).isAfter(to);

/**
 * Returns the min and max values for the domain of a date histogram given the time range, the interval and one anchor point.
 */
const getDomainBounds = (
  from: moment.Moment,
  to: moment.Moment,
  anchor: number,
  step: number,
  unit: Unit,
  timeZone: string,
  dropPartials: boolean
): { min: number; max: number } | undefined => {
  if (!step || step <= 0) {
    return undefined;
  }

  const anchorTime = moment.tz(anchor, timeZone);

  const stepsBefore = Math.ceil(anchorTime.diff(from, unit, true) / step);
  const start = anchorTime.clone().subtract(stepsBefore * step, unit);

  const stepsAfter = Math.floor(to.diff(anchorTime, unit, true) / step);
  const end = anchorTime.clone().add(stepsAfter * step, unit);

  let min = start.clone();
  let max = end.clone();

  if (dropPartials) {
    if (!isFullyContained(min, from, to, step, unit)) {
      min = start.clone().add(step, unit);
    }
    if (!isFullyContained(max, from, to, step, unit)) {
      max = end.clone().subtract(step, unit);
    }
    if (min.valueOf() > max.valueOf()) {
      return undefined;
    }
  }

  return { min: min.valueOf(), max: max.valueOf() };
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

    // Bucket boundaries and interval should must the timezone ES|QL BUCKET so calendar intervals are aligned.
    const timeZone = meta.timeZone || contextTimeZone;
    const parsedInterval = splitStringInterval(intervalString);
    const interval = parseInterval(intervalString);

    if (!parsedInterval || !interval) {
      return input;
    }

    const from = moment.tz(timeRange.from, timeZone);
    const to = moment.tz(timeRange.to, timeZone);

    const computedDomain = getDomainBounds(
      from,
      to,
      input.rows[0]?.[column.id] ?? from.valueOf(),
      parsedInterval.value,
      parsedInterval.unit,
      timeZone,
      dropPartials
    );

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
          isFullyContained(
            moment.tz(bucketStart, timeZone),
            from,
            to,
            parsedInterval.value,
            parsedInterval.unit
          )
        );
      }),
    };
  };
