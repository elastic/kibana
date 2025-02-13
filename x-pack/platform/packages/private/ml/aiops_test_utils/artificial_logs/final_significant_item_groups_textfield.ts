/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';

export const finalSignificantItemGroupsTextfield: SignificantItemGroup[] = [
  {
    docCount: 636,
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'home.php',
        key: 'url:home.php',
        pValue: 0.00974308761016614,
        type: 'keyword',
      },
      {
        docCount: 636,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        key: 'user:Peter',
        pValue: 0.00974308761016614,
        type: 'keyword',
      },
    ],
    id: '2091742187',
    pValue: 0.00974308761016614,
  },
  {
    docCount: 634,
    group: [
      {
        docCount: 1266,
        duplicate: 2,
        fieldName: 'response_code',
        fieldValue: '500',
        key: 'response_code:500',
        pValue: 0.012783309213417932,
        type: 'keyword',
      },
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'home.php',
        key: 'url:home.php',
        pValue: 0.00974308761016614,
        type: 'keyword',
      },
      {
        docCount: 634,
        duplicate: 2,
        fieldName: 'message',
        fieldValue: 'an unexpected error occured',
        key: 'an unexpected error occured',
        pValue: 0.00974308761016614,
        type: 'log_pattern',
      },
    ],
    id: '1528268618',
    pValue: 0.00974308761016614,
  },
  {
    docCount: 632,
    group: [
      {
        docCount: 1266,
        duplicate: 2,
        fieldName: 'response_code',
        fieldValue: '500',
        key: 'response_code:500',
        pValue: 0.012783309213417932,
        type: 'keyword',
      },
      {
        docCount: 790,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        key: 'url:login.php',
        pValue: 0.012783309213417932,
        type: 'keyword',
      },
      {
        docCount: 632,
        duplicate: 2,
        fieldName: 'message',
        fieldValue: 'an unexpected error occured',
        key: 'an unexpected error occured',
        pValue: 0.012783309213417932,
        type: 'log_pattern',
      },
    ],
    id: '2619569380',
    pValue: 0.012783309213417932,
  },
  {
    docCount: 632,
    group: [
      {
        docCount: 790,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        key: 'url:login.php',
        pValue: 0.012783309213417932,
        type: 'keyword',
      },
      {
        docCount: 632,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        key: 'user:Peter',
        pValue: 0.012783309213417932,
        type: 'keyword',
      },
    ],
    id: '1937394803',
    pValue: 0.012783309213417932,
  },
];
