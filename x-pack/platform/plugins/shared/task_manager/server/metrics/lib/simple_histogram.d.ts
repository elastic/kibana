/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
export interface SerializedHistogram extends JsonObject {
  counts: number[];
  values: number[];
}
export declare class SimpleHistogram {
  private maxValue;
  private bucketSize;
  private histogramBuckets;
  private allValues;
  constructor(max: number, bucketSize: number);
  reset(): void;
  record(value: number, increment?: number): void;
  get(truncate?: boolean): {
    count: number;
    value: number;
  }[];
  getAllValues(truncate?: boolean): number[];
  serialize(): SerializedHistogram;
  private initializeBuckets;
}
