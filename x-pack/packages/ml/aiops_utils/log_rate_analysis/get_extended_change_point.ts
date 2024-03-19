/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean } from 'd3-array';

export const getExtendedChangePoint = (buckets: Record<string, number>, changePointTs: number) => {
  const bucketKeys = Object.keys(buckets);
  const bucketValues = Object.values(buckets);
  const meanValue = Math.round(mean(bucketValues) ?? 0);
  const cpIndex = bucketKeys.findIndex((d) => +d === changePointTs);
  const cpValue = buckets[changePointTs];

  let lIndex = cpIndex - 1;
  let uIndex = cpIndex + 1;

  while (
    lIndex >= 0 &&
    Math.abs(bucketValues[lIndex] - meanValue) > Math.abs(bucketValues[lIndex] - cpValue)
  ) {
    lIndex--;
  }

  while (
    uIndex < bucketValues.length &&
    Math.abs(bucketValues[uIndex] - meanValue) > Math.abs(bucketValues[uIndex] - cpValue)
  ) {
    uIndex++;
  }

  return { startTs: +bucketKeys[lIndex], endTs: +bucketKeys[uIndex] };
};
