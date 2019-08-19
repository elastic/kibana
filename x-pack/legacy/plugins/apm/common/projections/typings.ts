/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';

export type Projection = Omit<SearchParams, 'body' | 'aggs'> & {
  body: {
    query: any;
  } & {
    aggs?: {
      [key: string]: {
        terms: any;
      };
    };
  };
};

export enum PROJECTION {
  SERVICES = 'services',
  TRANSACTION_GROUPS = 'transactionGroups',
  TRACES = 'traces',
  TRANSACTIONS = 'transactions',
  METRICS = 'metrics',
  ERROR_GROUPS = 'errorGroups'
}
