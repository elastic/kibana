/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CountParams, CountResponse } from 'elasticsearch';

export interface HistogramQueryResult {
  key: number;
  doc_count: number;
  bucket_total: {
    value: number;
  };
  down: {
    bucket_count: {
      value: number;
    };
  };
}

export interface UMESBucket {
  key: number;
}

export interface UMESHistogramBucket {
  x: number;
  x0: number;
}

export interface DatabaseAdapter {
  count(request: any, params: CountParams): Promise<CountResponse>;
  search(request: any, params: any): Promise<any>;
  head(request: any, params: any): Promise<any>;
}
