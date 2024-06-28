/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';

import type { FieldValuePairCounts } from '../types';

/**
 * Analyse duplicate field/value pairs in groups.
 */
export function getMarkedDuplicates(
  cpgs: SignificantItemGroup[],
  fieldValuePairCounts: FieldValuePairCounts
): SignificantItemGroup[] {
  return cpgs.map((cpg) => {
    return {
      ...cpg,
      group: cpg.group.map((g) => {
        return {
          ...g,
          duplicate: fieldValuePairCounts[g.fieldName][g.fieldValue],
        };
      }),
    };
  });
}
