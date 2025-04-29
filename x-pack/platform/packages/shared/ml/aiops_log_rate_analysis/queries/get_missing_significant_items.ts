/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

export function getMissingSignificantItems(
  significantItems: SignificantItem[],
  significantItemGroups: SignificantItemGroup[]
) {
  return significantItems.filter((cp) => {
    return !significantItemGroups.some((cpg) => {
      return cpg.group.some((d) => d.fieldName === cp.fieldName && d.fieldValue === cp.fieldValue);
    });
  });
}
