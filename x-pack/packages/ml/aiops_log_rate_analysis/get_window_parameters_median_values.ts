/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { median } from 'd3-array';

import type { SignificantItemHistogramItem } from '@kbn/ml-agg-utils';
import type { WindowParameters } from './window_parameters';

/**
 * Return the median values for the the baseline/deviation
 * time ranges on a given significant item histogram.
 *
 * @param significanItemHistogram The log rate histogram for the significant item.
 * @param windowParameters The window parameters with baseline and deviation time range.
 * @returns The median values for the deviation and baseline timeranges.
 */
export function getWindowParametersMedianValues(
  significanItemHistogram: SignificantItemHistogramItem[],
  windowParameters: WindowParameters
): { deviationMedian: number; baselineMedian: number } {
  const { baselineMin, baselineMax, deviationMin, deviationMax } = windowParameters;
  const baselineItems = significanItemHistogram.filter(
    (d) => d.key >= baselineMin && d.key < baselineMax
  );
  const baselineMedian =
    median(
      // @ts-ignore
      baselineItems.map((d) => d.doc_count_significant_item ?? d.doc_count_significant_term)
    ) ?? 0;

  const deviationItems = significanItemHistogram.filter(
    (d) => d.key >= deviationMin && d.key < deviationMax
  );
  const deviationMedian =
    median(
      // @ts-ignore
      deviationItems.map((d) => d.doc_count_significant_item ?? d.doc_count_significant_term)
    ) ?? 0;

  return { deviationMedian, baselineMedian };
}
