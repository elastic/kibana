/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/aiops-utils/log_rate_analysis/types';

export const filteredFrequentItemSets: ItemSet[] = [
  {
    set: [
      { fieldName: 'response_code', fieldValue: '500' },
      { fieldName: 'url', fieldValue: 'home.php' },
    ],
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 792,
    support: 0.5262458471760797,
    total_doc_count: 1505,
  },
  {
    set: [
      { fieldName: 'user', fieldValue: 'Peter' },
      { fieldName: 'url', fieldValue: 'home.php' },
    ],
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 634,
    support: 0.4212624584717608,
    total_doc_count: 1505,
  },
];
