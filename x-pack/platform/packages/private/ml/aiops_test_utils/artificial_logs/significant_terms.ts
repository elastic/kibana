/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem } from '@kbn/ml-agg-utils';

// Named significantTerms since all these items are of type `keyword`.
export const significantTerms: SignificantItem[] = [
  {
    key: 'user:Peter',
    type: 'keyword',
    fieldName: 'user',
    fieldValue: 'Peter',
    doc_count: 1981,
    bg_count: 553,
    total_doc_count: 4669,
    total_bg_count: 1975,
    score: 47.38899434932384,
    pValue: 2.62555579103777e-21,
    normalizedScore: 0.8328439168064725,
  },
  {
    key: 'response_code:500',
    type: 'keyword',
    fieldName: 'response_code',
    fieldValue: '500',
    doc_count: 1819,
    bg_count: 553,
    total_doc_count: 4669,
    total_bg_count: 1975,
    score: 26.347710713220195,
    pValue: 3.6085657805889595e-12,
    normalizedScore: 0.7809229492301661,
  },
  {
    key: 'url:home.php',
    type: 'keyword',
    fieldName: 'url',
    fieldValue: 'home.php',
    doc_count: 1744,
    bg_count: 632,
    total_doc_count: 4669,
    total_bg_count: 1975,
    score: 4.631197208465419,
    pValue: 0.00974308761016614,
    normalizedScore: 0.12006631193078789,
  },
  {
    key: 'url:login.php',
    type: 'keyword',
    fieldName: 'url',
    fieldValue: 'login.php',
    doc_count: 1738,
    bg_count: 632,
    total_doc_count: 4669,
    total_bg_count: 1975,
    score: 4.359614926663956,
    pValue: 0.012783309213417932,
    normalizedScore: 0.07472703283204607,
  },
];
