/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/ml-agg-utils';

import { getValueCounts } from './get_value_counts';

export function getValuesDescending(df: ItemSet[], field: string): string[] {
  const valueCounts = getValueCounts(df, field);
  const keys = Object.keys(valueCounts);

  return keys.sort((a, b) => {
    return valueCounts[b] - valueCounts[a];
  });
}
