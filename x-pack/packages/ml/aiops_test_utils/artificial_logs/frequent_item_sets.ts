/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/aiops-utils/log_rate_analysis/types';

export const frequentItemSets: ItemSet[] = [
  {
    set: [
      { fieldName: 'response_code', fieldValue: '500' },
      { fieldName: 'url', fieldValue: 'home.php' },
    ],
    size: 2,
    maxPValue: 0.00974308761016614,
    doc_count: 792,
    support: 0.2703994537384773,
    total_doc_count: 2929,
  },
  {
    set: [
      { fieldName: 'response_code', fieldValue: '500' },
      { fieldName: 'url', fieldValue: 'login.php' },
    ],
    size: 2,
    maxPValue: 0.012783309213417932,
    doc_count: 790,
    support: 0.2697166268350973,
    total_doc_count: 2929,
  },
  {
    set: [
      { fieldName: 'user', fieldValue: 'Peter' },
      { fieldName: 'url', fieldValue: 'home.php' },
    ],
    size: 2,
    maxPValue: 0.00974308761016614,
    doc_count: 636,
    support: 0.21713895527483784,
    total_doc_count: 2929,
  },
  {
    set: [
      { fieldName: 'user', fieldValue: 'Peter' },
      { fieldName: 'url', fieldValue: 'login.php' },
    ],
    size: 2,
    maxPValue: 0.012783309213417932,
    doc_count: 632,
    support: 0.21577330146807785,
    total_doc_count: 2929,
  },
  {
    set: [
      { fieldName: 'response_code', fieldValue: '500' },
      { fieldName: 'user', fieldValue: 'Peter' },
    ],
    size: 2,
    maxPValue: 3.6085657805889595e-12,
    doc_count: 79,
    support: 0.026971662683509732,
    total_doc_count: 2929,
  },
];
