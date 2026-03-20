/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm.
 *
 * Reduces a time series to `threshold` points while preserving the visual
 * shape by selecting the point in each bucket that forms the largest triangle
 * with the previously selected point and the average of the next bucket.
 *
 * Reference: Sveinn Steinarsson, "Downsampling Time Series for Visual
 * Representation", University of Iceland, 2013.
 *
 * @returns Sorted array of row indices to keep.
 */
export function lttb(xValues: number[], yValues: number[], threshold: number): number[] {
  const dataLength = xValues.length;

  if (dataLength <= threshold || threshold < 3) {
    return Array.from({ length: dataLength }, (_, i) => i);
  }

  const sampled: number[] = [0];
  const bucketSize = (dataLength - 2) / (threshold - 2);

  let prevSelected = 0;

  for (let bucket = 0; bucket < threshold - 2; bucket++) {
    const rangeStart = Math.floor(bucket * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((bucket + 1) * bucketSize) + 1, dataLength);

    const nextStart = Math.floor((bucket + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, dataLength);

    let avgX = 0;
    let avgY = 0;
    const nextLen = nextEnd - nextStart;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += xValues[j];
      avgY += yValues[j];
    }
    avgX /= nextLen;
    avgY /= nextLen;

    const pX = xValues[prevSelected];
    const pY = yValues[prevSelected];

    let maxArea = -1;
    let maxIdx = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs((pX - avgX) * (yValues[j] - pY) - (pX - xValues[j]) * (avgY - pY));
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    sampled.push(maxIdx);
    prevSelected = maxIdx;
  }

  sampled.push(dataLength - 1);
  return sampled;
}

/**
 * Multi-metric LTTB: runs LTTB independently for each y-column and returns
 * the sorted union of all selected indices, so that no visually significant
 * point for any metric is lost.
 */
export function lttbMultiMetric(
  xValues: number[],
  yColumns: number[][],
  threshold: number
): number[] {
  if (yColumns.length === 0) {
    return lttb(xValues, xValues, threshold);
  }

  if (yColumns.length === 1) {
    return lttb(xValues, yColumns[0], threshold);
  }

  const indexSet = new Set<number>();
  for (const yValues of yColumns) {
    for (const idx of lttb(xValues, yValues, threshold)) {
      indexSet.add(idx);
    }
  }

  return [...indexSet].sort((a, b) => a - b);
}
