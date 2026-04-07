/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function hasSortedValue(sortedValues: number[], targetValue: number): boolean {
  let leftIndex = 0;
  let rightIndex = sortedValues.length - 1;

  while (leftIndex <= rightIndex) {
    const middleIndex = Math.floor((leftIndex + rightIndex) / 2);
    const middleValue = sortedValues[middleIndex];

    if (middleValue === targetValue) {
      return true;
    }

    if (middleValue < targetValue) {
      leftIndex = middleIndex + 1;
      continue;
    }

    rightIndex = middleIndex - 1;
  }

  return false;
}
