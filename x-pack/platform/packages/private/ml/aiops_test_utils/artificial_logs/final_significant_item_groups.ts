/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';

export const finalSignificantItemGroups: SignificantItemGroup[] = [
  {
    id: '2675980076',
    group: [
      {
        key: 'response_code:500',
        type: 'keyword',
        fieldName: 'response_code',
        fieldValue: '500',
        docCount: 792,
        pValue: 0.012783309213417932,
        duplicate: 2,
      },
      {
        key: 'url:home.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'home.php',
        docCount: 792,
        pValue: 0.00974308761016614,
        duplicate: 2,
      },
    ],
    docCount: 792,
    pValue: 0.00974308761016614,
  },
  {
    id: '3819687732',
    group: [
      {
        key: 'response_code:500',
        type: 'keyword',
        fieldName: 'response_code',
        fieldValue: '500',
        docCount: 792,
        pValue: 0.012783309213417932,
        duplicate: 2,
      },
      {
        key: 'url:login.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'login.php',
        docCount: 790,
        pValue: 0.012783309213417932,
        duplicate: 2,
      },
    ],
    docCount: 790,
    pValue: 0.012783309213417932,
  },
  {
    id: '2091742187',
    group: [
      {
        key: 'url:home.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'home.php',
        docCount: 792,
        pValue: 0.00974308761016614,
        duplicate: 2,
      },
      {
        key: 'user:Peter',
        type: 'keyword',
        fieldName: 'user',
        fieldValue: 'Peter',
        docCount: 636,
        pValue: 0.00974308761016614,
        duplicate: 2,
      },
    ],
    docCount: 636,
    pValue: 0.00974308761016614,
  },
  {
    id: '1937394803',
    group: [
      {
        key: 'url:login.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'login.php',
        docCount: 790,
        pValue: 0.012783309213417932,
        duplicate: 2,
      },
      {
        key: 'user:Peter',
        type: 'keyword',
        fieldName: 'user',
        fieldValue: 'Peter',
        docCount: 632,
        pValue: 0.012783309213417932,
        duplicate: 2,
      },
    ],
    docCount: 632,
    pValue: 0.012783309213417932,
  },
];
