/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem } from '@kbn/ml-agg-utils';

// Named significantLogPatterns since all these items are of type `log_pattern`.
export const significantLogPatterns: SignificantItem[] = [
  {
    bg_count: 0,
    doc_count: 1266,
    fieldName: 'message',
    fieldValue: 'an unexpected error occured',
    key: 'an unexpected error occured',
    normalizedScore: 0,
    pValue: 0.000001,
    score: -13.815510557964274,
    total_bg_count: 1975,
    total_doc_count: 4669,
    type: 'log_pattern',
  },
];
