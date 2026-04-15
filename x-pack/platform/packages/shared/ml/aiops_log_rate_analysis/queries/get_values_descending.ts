/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getValuesDescendingFromValueCounts(valueCounts: Record<string, number>): string[] {
  const values = Object.keys(valueCounts);

  return values.sort((leftValue, rightValue) => {
    return valueCounts[rightValue] - valueCounts[leftValue];
  });
}
