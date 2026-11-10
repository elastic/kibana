/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '@kbn/datemath';
import dateMath from '@kbn/datemath';
import {
  DatatableUtilitiesService,
  parseInterval,
  splitStringInterval,
} from '@kbn/data-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { uniq } from 'lodash';
import moment from 'moment-timezone';

type IntervalUnit = NonNullable<ReturnType<typeof splitStringInterval>>['unit'];

// `getDateHistogramMeta` and `getColumnTimeRange` read only the column, so the services the
// constructor takes are never called.
const datatableUtilities = new DatatableUtilitiesService(
  {} as ConstructorParameters<typeof DatatableUtilitiesService>[0],
  {} as ConstructorParameters<typeof DatatableUtilitiesService>[1],
  {} as ConstructorParameters<typeof DatatableUtilitiesService>[2]
);

const DEFAULT_TIME_ZONE = 'UTC';

/** An ES|QL date column bucketed by `BUCKET`, as `lens_date_histogram_textbased` finds it. */
const isDateHistogramColumn = (column: DatatableColumn) =>
  column.meta?.esType === 'date' && column.meta?.esMeta?.bucket !== undefined;

const isFullyContained = (
  bucketStart: moment.Moment,
  from: moment.Moment,
  to: moment.Moment,
  step: number,
  unit: IntervalUnit
) => !bucketStart.isBefore(from) && !bucketStart.clone().add(step, unit).isAfter(to);

/** Lens's `getDomainBounds`: the first and last buckets in the time range, from one anchor. */
const getDomainBounds = (
  from: moment.Moment,
  to: moment.Moment,
  anchor: number | string,
  step: number,
  unit: IntervalUnit,
  timeZone: string,
  dropPartials: boolean
): { min: number; max: number } | undefined => {
  if (!step || step <= 0) {
    return undefined;
  }
  const anchorTime = moment.tz(anchor, timeZone);
  const start = anchorTime
    .clone()
    .subtract(Math.ceil(anchorTime.diff(from, unit, true) / step) * step, unit);
  const end = anchorTime
    .clone()
    .add(Math.floor(to.diff(anchorTime, unit, true) / step) * step, unit);
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
 * Lens's `lens_date_histogram_textbased` (`dateHistogramTextBasedFn`), which every ES|QL Lens layer
 * runs after its query: for the first date column an ES|QL `BUCKET` built, it states the domain of
 * buckets the time range spans (`sourceParams.computedDomain`) and, unless the bucket keeps them,
 * drops the rows of buckets the time range only partly covers. Other tables come back unchanged.
 */
export const prepareEsqlDateHistogram = (
  input: Datatable,
  contextTimeZone: string = DEFAULT_TIME_ZONE
): Datatable => {
  const column = input.columns.find(isDateHistogramColumn);
  if (!column) {
    return input;
  }
  const meta = datatableUtilities.getDateHistogramMeta(column, { timeZone: contextTimeZone });
  if (!meta?.interval || !meta.timeRange) {
    return input;
  }
  const dropPartials = meta.dropPartials ?? true;
  const timeZone = meta.timeZone || contextTimeZone;
  const parsedInterval = splitStringInterval(meta.interval);
  if (!parsedInterval || !parseInterval(meta.interval)) {
    return input;
  }
  const from = moment.tz(meta.timeRange.from, timeZone);
  const to = moment.tz(meta.timeRange.to, timeZone);
  const computedDomain = getDomainBounds(
    from,
    to,
    (input.rows[0]?.[column.id] as number | undefined) ?? from.valueOf(),
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

/**
 * Lens's `calculateMinInterval` on a time chart: the x column's date histogram interval, in
 * milliseconds, as `parseInterval` reads it.
 */
export const dateMinInterval = (column: DatatableColumn | undefined): number | undefined => {
  const interval = column ? datatableUtilities.getDateHistogramMeta(column)?.interval : undefined;
  return interval ? parseInterval(interval)?.as('milliseconds') : undefined;
};

/** Elastic Charts' `findIntervalFromDuration`, from the charts plugin's `endzones`. */
const findIntervalFromDuration = (
  dateValue: number,
  esValue: number,
  esUnit: moment.unitOfTime.Base,
  timeZone: string
) => {
  const startOfDate = moment.tz(dateValue, timeZone).startOf(esUnit);
  const endOfDate = moment.tz(dateValue, timeZone).startOf(esUnit).add(esValue, esUnit);
  return endOfDate.valueOf() - startOfDate.valueOf();
};

/** The charts plugin's `getAdjustedInterval`: the shortest calendar bucket among the x values. */
const getAdjustedInterval = (
  xValues: number[],
  esValue: number,
  esUnit: moment.unitOfTime.Base,
  timeZone: string
): number => {
  const newInterval = xValues.reduce((minInterval, currentXvalue, index) => {
    const currentDiff = index > 0 ? Math.abs(xValues[index - 1] - currentXvalue) : minInterval;
    const singleUnitInterval =
      esUnit === 's'
        ? 1000 * esValue
        : esUnit === 'ms'
        ? esValue
        : findIntervalFromDuration(currentXvalue, esValue, esUnit, timeZone);
    return Math.min(minInterval, singleUnitInterval, currentDiff);
  }, Number.MAX_SAFE_INTEGER);
  return newInterval > 0 ? newInterval : moment.duration(esValue, esUnit).asMilliseconds();
};

const CALENDAR_UNITS: readonly Unit[] = ['d', 'w', 'M', 'y'];

/**
 * Lens's `getXValues`: each layer's x cells by `valueOf()`, without duplicates, sorted as numbers.
 * ES|QL dates stay ISO strings here, as in Lens, so `getAdjustedInterval` then finds no shorter
 * bucket between them and keeps the interval's own duration.
 */
const getXValues = (layers: TimeLayer[]): unknown[] =>
  uniq(
    layers
      .flatMap(({ table, x }) =>
        table.rows.map((row) => (row[x] ? (row[x] as { valueOf(): unknown }).valueOf() : row[x]))
      )
      .filter((value) => value !== undefined)
      .sort((a, b) => (a as number) - (b as number))
  );

/** A data layer's table and the id of its x column there. */
export interface TimeLayer {
  table: Datatable;
  x: string;
}

/**
 * Lens's `getXDomain` on a time chart: its `extendedDomain`, which Lens gives Elastic Charts as
 * `Settings.xDomain`. The domain runs over the buckets the time range spans (the ES|QL
 * `computedDomain`, or the x values and the time range), one bucket further for lines and areas,
 * and its interval is the shortest calendar bucket for day, week, month and year buckets.
 * Undefined when the x column carries no time range.
 */
export const timeXDomain = (
  layers: TimeLayer[],
  minInterval: number | undefined,
  hasBars: boolean,
  timeZone: string = DEFAULT_TIME_ZONE
): { min: number; max: number; minInterval?: number } | undefined => {
  let timeRange: { from: string; to: string } | undefined;
  let appliedTimeRange: { from: string; to: string } | undefined;
  const domains: Array<{ min: number; max: number }> = [];
  for (const { table, x } of layers) {
    const column = table.columns.find(({ id }) => id === x);
    if (!column) {
      continue;
    }
    const meta = datatableUtilities.getDateHistogramMeta(column);
    if (meta) {
      timeRange ??= meta.timeRange as { from: string; to: string } | undefined;
      if (meta.domain) {
        domains.push(meta.domain);
      }
    }
    appliedTimeRange ??= datatableUtilities.getColumnTimeRange(column) as typeof appliedTimeRange;
  }
  const baseDomain = {
    min: timeRange?.from ? moment(timeRange.from).valueOf() : NaN,
    max: timeRange?.to ? moment(timeRange.to).valueOf() : NaN,
  };
  if (!minInterval || Number.isNaN(baseDomain.min) || Number.isNaN(baseDomain.max)) {
    return appliedTimeRange?.from && appliedTimeRange?.to
      ? {
          min: moment(appliedTimeRange.from).valueOf(),
          max: moment(appliedTimeRange.to).valueOf(),
          ...(minInterval ? { minInterval } : {}),
        }
      : undefined;
  }
  const xValues = getXValues(layers);
  const computed =
    domains.length > 0
      ? {
          min: Math.min(...domains.map(({ min }) => min)),
          max: Math.max(...domains.map(({ max }) => max)),
        }
      : undefined;
  const min = computed ? computed.min : Math.min(Number(xValues[0]), baseDomain.min);
  const maxValue = computed
    ? computed.max
    : Math.max(baseDomain.max - minInterval, Number(xValues[xValues.length - 1]));
  const max = hasBars ? maxValue : maxValue + minInterval;
  const duration = moment.duration(minInterval);
  const unit = dateMath.units.find((candidate) => Number.isInteger(duration.as(candidate))) as
    | Unit
    | undefined;
  const adjusted =
    xValues.length && unit && CALENDAR_UNITS.includes(unit)
      ? getAdjustedInterval(xValues as number[], duration.as(unit), unit, timeZone)
      : minInterval;
  return { min, max, minInterval: adjusted };
};
