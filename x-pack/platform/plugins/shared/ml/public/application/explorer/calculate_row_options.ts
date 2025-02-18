/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const calculateRowOptions = (rowOptions: number[], cardinality: number): number[] => {
  return rowOptions.reduce((acc, v) => {
    if (v <= cardinality) {
      acc.push(v);
    } else if (acc.length === 0 || acc[acc.length - 1] < cardinality) {
      acc.push(v);
    }
    return acc;
  }, [] as number[]);
};
