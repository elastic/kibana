/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotAggDict } from './pivot_aggs';
import { PivotGroupByDict } from './pivot_group_by';

export type IndexName = string;
export type IndexPattern = string;
export type JobId = string;

export interface DataFrameJob {
  description?: string;
  dest: {
    index: IndexName;
  };
  source: {
    index: IndexPattern;
  };
  sync?: {
    time: {
      field: string;
      delay: string;
    };
  };
}

export interface DataFrameTransform extends DataFrameJob {
  pivot: {
    aggregations: PivotAggDict;
    group_by: PivotGroupByDict;
  };
}

export interface DataFrameTransformWithId extends DataFrameTransform {
  id: string;
}

// Don't allow intervals of '0', don't allow floating intervals.
export const delayFormatRegex = /^[1-9][0-9]*(nanos|micros|ms|s|m|h|d)$/;
