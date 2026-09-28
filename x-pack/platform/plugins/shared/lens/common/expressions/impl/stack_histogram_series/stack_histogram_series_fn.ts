/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { stackHistogramSeries, type StackHistogramSeriesArgs } from './stack_histogram_series';

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

export const stackHistogramSeriesFn = (
  input: Datatable,
  args: StackHistogramSeriesFnArgs
): Datatable => {
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
    ...(args.sampleProbability !== undefined ? { sampleProbability: args.sampleProbability } : {}),
  };
  return stackHistogramSeries(input, stackArgs);
};
