/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the intersection of two sorted item set index arrays.
 *
 * We use a small custom helper here because these index arrays are already
 * sorted. That lets us walk both arrays once and find the shared indexes
 * efficiently during tree traversal.
 */
export function getItemSetIndexesIntersection(left: number[], right: number[]): number[] {
  const intersection: number[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftValue = left[leftIndex];
    const rightValue = right[rightIndex];

    if (leftValue === rightValue) {
      intersection.push(leftValue);
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (leftValue < rightValue) {
      leftIndex += 1;
      continue;
    }

    rightIndex += 1;
  }

  return intersection;
}
