/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, sortBy, sum } from 'lodash';

export function createLatencyHistogram(totalCount: number, latency: { min: number; max: number }) {
  if (totalCount === 0) {
    return { values: [] as number[], counts: [] as number[] };
  }
  const values: number[] = [];
  const counts: number[] = [];
  while (sum(counts) < totalCount) {
    const remaining = totalCount - sum(counts);
    const maxInterval = Math.floor(totalCount * 0.1);
    const value = random(latency.min, latency.max);
    const count =
      maxInterval < 1 ? totalCount : remaining > maxInterval ? random(1, maxInterval) : remaining;
    values.push(value);
    counts.push(count);
  }
  return { values: sortBy(values), counts: sortBy(counts) };
}
