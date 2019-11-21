/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LogSummaryBucket {
  count: number;
  end: number;
  start: number;
}

export type SummaryBucketSize = 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's';
