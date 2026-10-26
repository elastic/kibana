/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricType } from '../schemas/experiments/compare_experiments_route.gen';

export type { MetricType };

/**
 * Maximum share of distinct values among the observed scores for an integer metric to be
 * treated as an ordinal scale.
 */
const ORDINAL_MAX_UNIQUE_RATIO = 0.5;

const isBinary = (value: number): boolean => value === 0 || value === 1;

/** True when the distinct values form the dense run 1..k, the shape of a Likert-style scale. */
function isContiguousFromOne(values: number[]): boolean {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  return distinct[0] === 1 && distinct.every((value, index) => value === index + 1);
}

/**
 * Infer the metric type. Returns `undefined` when there are no observed scores.
 */
export function inferMetricType(target: number[], baseline: number[]): MetricType | undefined {
  const values = [...target, ...baseline];

  if (values.length === 0) {
    return undefined;
  }

  if (values.every(isBinary)) {
    return 'binary';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min >= 0 && values.every((value) => Number.isInteger(value))) {
    // TODO: observed values alone cannot separate a scale from a small count. `Chat Calls`
    // observed as [1, 2, 3, 1, 2] is contiguous from 1 with a low unique ratio and is
    // classified as ordinal_k although it is a count.
    const uniqueRatio = new Set(values).size / values.length;
    if (min >= 1 && isContiguousFromOne(values) && uniqueRatio <= ORDINAL_MAX_UNIQUE_RATIO) {
      return 'ordinal_k';
    }

    return 'count';
  }

  if (min >= 0 && max <= 1) {
    return 'continuous_bounded';
  }

  return 'continuous_unbounded';
}
