/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META,
  TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META,
} from '@kbn/lens-common';
import type { Duration } from 'moment';
import moment from 'moment-timezone';

export interface StackHistogramSeriesArgs {
  timeColumn: string;
  totalColumn: string;
  overlayColumn: string;
  remainderColumn: string;
  label: string;
  from: string;
  to: string;
  values: number[];
  isSampled: boolean;
  sampleProbability?: number;
}

/** Histogram interval already resolved by datatable utilities. */
export interface StackHistogramInterval {
  interval: Duration;
  timeZone?: string;
}

const readTimestamp = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const calendarDuration = (start: number, histogram: StackHistogramInterval): number | undefined => {
  const startMoment = moment.tz(start, histogram.timeZone ?? 'UTC');
  const duration = startMoment.clone().add(histogram.interval).valueOf() - startMoment.valueOf();
  return duration > 0 ? duration : undefined;
};

const inferFixedInterval = (starts: number[]): number | undefined => {
  if (starts.length < 2) {
    return undefined;
  }

  const interval = starts[1] - starts[0];

  if (interval <= 0) {
    return undefined;
  }

  for (let index = 2; index < starts.length; index++) {
    if (starts[index] - starts[index - 1] !== interval) {
      return undefined;
    }
  }

  return interval;
};

const scaleValues = (
  args: StackHistogramSeriesArgs
): { values: number[]; approximate: boolean } => {
  if (!args.isSampled) {
    return { values: args.values, approximate: false };
  }

  const probability = args.sampleProbability;

  if (probability === undefined || probability <= 0 || probability > 1) {
    return { values: args.values, approximate: true };
  }

  return {
    values: args.values.map((value) => value / probability),
    approximate: true,
  };
};

const finiteTotal = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const columnIdsCollide = (args: StackHistogramSeriesArgs): boolean =>
  args.timeColumn === args.overlayColumn ||
  args.totalColumn === args.overlayColumn ||
  args.timeColumn === args.remainderColumn ||
  args.totalColumn === args.remainderColumn ||
  args.overlayColumn === args.remainderColumn;

/**
 * Keeps the chart renderable when the pattern series cannot be aligned.
 * Colliding column ids cannot be declared twice, so that case only marks the table unapplied.
 */
const zeroOverlayTable = (table: Datatable, args: StackHistogramSeriesArgs): Datatable => {
  const totalColumn = table.columns.find((column) => column.id === args.totalColumn);
  const numberMeta = totalColumn?.meta ?? { type: 'number' as const };
  const meta = {
    ...table.meta,
    [TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]: false,
    [TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]: false,
  };

  if (columnIdsCollide(args)) {
    return { ...table, meta };
  }

  const generatedIds = new Set([args.remainderColumn, args.overlayColumn]);
  const remainderColumn: DatatableColumn = {
    id: args.remainderColumn,
    name: args.remainderColumn,
    meta: { ...numberMeta, type: 'number' },
  };
  const overlayColumn: DatatableColumn = {
    id: args.overlayColumn,
    name: args.label || args.overlayColumn,
    meta: { ...numberMeta, type: 'number' },
  };

  return {
    ...table,
    columns: [
      ...table.columns.filter((column) => !generatedIds.has(column.id)),
      remainderColumn,
      overlayColumn,
    ],
    rows: table.rows.map((row) => ({
      ...row,
      [args.overlayColumn]: 0,
      [args.remainderColumn]: finiteTotal(row[args.totalColumn]),
    })),
    meta,
  };
};

/**
 * Adds overlay and remainder columns aligned to the histogram buckets.
 * Emits a zero-height overlay when the input cannot be stacked so the chart accessors stay valid.
 */
export const stackHistogramSeries = (
  table: Datatable,
  args: StackHistogramSeriesArgs,
  histogram?: StackHistogramInterval
): Datatable => {
  if (
    columnIdsCollide(args) ||
    args.values.length === 0 ||
    args.values.some((value) => !Number.isFinite(value))
  ) {
    return zeroOverlayTable(table, args);
  }

  const timeColumn = table.columns.find((column) => column.id === args.timeColumn);
  const totalColumn = table.columns.find((column) => column.id === args.totalColumn);

  if (!timeColumn || !totalColumn) {
    return zeroOverlayTable(table, args);
  }

  if (
    table.columns.some(
      (column) => column.id === args.overlayColumn || column.id === args.remainderColumn
    )
  ) {
    return zeroOverlayTable(table, args);
  }

  const from = Date.parse(args.from);
  const to = Date.parse(args.to);

  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return zeroOverlayTable(table, args);
  }

  const starts = table.rows.map((row) => readTimestamp(row[args.timeColumn]));

  if (starts.some((start) => start === undefined) || starts.length === 0) {
    return zeroOverlayTable(table, args);
  }

  const bucketStarts = starts as number[];
  const fixedInterval = histogram ? undefined : inferFixedInterval(bucketStarts);
  const durationAt = (start: number): number | undefined => {
    if (histogram) {
      return calendarDuration(start, histogram);
    }

    if (fixedInterval !== undefined) {
      return fixedInterval;
    }

    if (bucketStarts.length === 1 && bucketStarts[0] === from) {
      return to - from;
    }

    return undefined;
  };

  const durations = bucketStarts.map(durationAt);

  if (durations.some((duration) => duration === undefined)) {
    return zeroOverlayTable(table, args);
  }

  const bucketEnds = bucketStarts.map((start, index) => start + (durations[index] as number));
  const minStart = Math.min(...bucketStarts);
  const maxEnd = Math.max(...bucketEnds);
  const rangesOverlap = maxEnd > from && minStart < to;

  if (!rangesOverlap) {
    return zeroOverlayTable(table, args);
  }

  const { values, approximate: sampled } = scaleValues(args);
  const width = (to - from) / values.length;
  const overlapCounts = new Array<number>(values.length).fill(0);
  const rows = table.rows.map((row, rowIndex) => {
    const start = bucketStarts[rowIndex];
    const end = bucketEnds[rowIndex];
    let overlay = 0;

    values.forEach((value, index) => {
      const bucketStart = from + index * width;
      const bucketEnd = bucketStart + width;
      const overlap = Math.min(end, bucketEnd) - Math.max(start, bucketStart);

      if (overlap <= 0) {
        return;
      }

      overlapCounts[index] += 1;
      overlay += value * (overlap / width);
    });

    const totalValue = finiteTotal(row[args.totalColumn]);
    const clipped = Math.min(Math.max(overlay, 0), Math.max(totalValue, 0));

    return {
      ...row,
      [args.overlayColumn]: clipped,
      [args.remainderColumn]: Math.max(totalValue - clipped, 0),
    };
  });

  const boundsMatch = minStart === from && maxEnd === to;
  const splitAcrossBuckets = overlapCounts.some((count) => count > 1);
  const numberMeta = totalColumn.meta ?? { type: 'number' as const };
  const overlayColumn: DatatableColumn = {
    id: args.overlayColumn,
    name: args.label || args.overlayColumn,
    meta: { ...numberMeta, type: 'number' },
  };
  const remainderColumn: DatatableColumn = {
    id: args.remainderColumn,
    name: args.remainderColumn,
    meta: { ...numberMeta, type: 'number' },
  };

  return {
    ...table,
    columns: [...table.columns, remainderColumn, overlayColumn],
    rows,
    meta: {
      ...table.meta,
      [TEXT_BASED_HISTOGRAM_OVERLAY_APPROXIMATE_META]:
        sampled || !boundsMatch || splitAcrossBuckets,
      [TEXT_BASED_HISTOGRAM_OVERLAY_APPLIED_META]: true,
    },
  };
};
