/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn, ExecutionContext } from '@kbn/expressions-plugin/common';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { parseInterval } from '@kbn/data-plugin/common';
import {
  stackHistogramSeries,
  type StackHistogramInterval,
  type StackHistogramSeriesArgs,
} from './stack_histogram_series';

export interface StackHistogramSeriesFnArgs {
  timeColumn: string;
  totalColumn: string;
  overlayColumn: string;
  remainderColumn: string;
  label: string;
  from: string;
  to: string;
  values: string;
  isSampled: boolean;
  sampleProbability?: number;
}

type GetDatatableUtilities = (
  context: ExecutionContext
) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>;

type GetTimezone = (context: ExecutionContext) => string | Promise<string>;

const readValues = (values: string): number[] | undefined => {
  try {
    const parsed: unknown = JSON.parse(values);

    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'number')) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};

/**
 * Resolves the histogram interval the same way the ES|QL date histogram does. Unlike `lens_time_scale`,
 * unavailable utilities or request context must not fail the chart, so the series falls back to
 * inferring the interval from the table.
 */
const resolveHistogramInterval = async (
  timeColumn: DatatableColumn,
  getDatatableUtilities: GetDatatableUtilities,
  getTimezone: GetTimezone,
  context: ExecutionContext
): Promise<StackHistogramInterval | undefined> => {
  try {
    const timeZone = await getTimezone(context);
    const datatableUtilities = await getDatatableUtilities(context);
    const meta = datatableUtilities.getDateHistogramMeta(timeColumn, { timeZone });
    const interval = meta?.interval ? parseInterval(meta.interval) : undefined;

    return interval ? { interval, timeZone: meta?.timeZone ?? timeZone } : undefined;
  } catch {
    return undefined;
  }
};

export const stackHistogramSeriesFn =
  (getDatatableUtilities: GetDatatableUtilities, getTimezone: GetTimezone) =>
  async (
    input: Datatable,
    args: StackHistogramSeriesFnArgs,
    context: ExecutionContext
  ): Promise<Datatable> => {
    const stackArgs: StackHistogramSeriesArgs = {
      timeColumn: args.timeColumn,
      totalColumn: args.totalColumn,
      overlayColumn: args.overlayColumn,
      remainderColumn: args.remainderColumn,
      label: args.label,
      from: args.from,
      to: args.to,
      values: readValues(args.values) ?? [],
      isSampled: args.isSampled,
      ...(args.sampleProbability !== undefined
        ? { sampleProbability: args.sampleProbability }
        : {}),
    };
    const timeColumn = input.columns.find((column) => column.id === args.timeColumn);
    const histogram = timeColumn
      ? await resolveHistogramInterval(timeColumn, getDatatableUtilities, getTimezone, context)
      : undefined;

    return stackHistogramSeries(input, stackArgs, histogram);
  };
