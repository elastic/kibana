/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/ml-agg-utils';

export function getValueCountsForItemSetIndexes(
  itemSets: ItemSet[],
  itemSetIndexes: number[],
  field: string
) {
  return itemSetIndexes.reduce<Record<string, number>>((counts, itemSetIndex) => {
    const fieldItems = itemSets[itemSetIndex].set.filter((item) => item.fieldName === field);

    if (fieldItems.length === 0) {
      return counts;
    }

    for (const { fieldValue } of fieldItems) {
      const fieldValueKey = String(fieldValue);
      counts[fieldValueKey] = counts[fieldValueKey] ? counts[fieldValueKey] + 1 : 1;
    }

    return counts;
  }, {});
}
