/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dictionary } from './common';
import type { EsFieldName } from './fields';

export type GenericAgg = object;

export interface TermsAgg {
  terms: {
    field: EsFieldName;
    missing_bucket?: boolean;
  };
}

export interface HistogramAgg {
  histogram: {
    field: EsFieldName;
    interval: string;
    missing_bucket?: boolean;
  };
}

export interface DateHistogramAgg {
  date_histogram: {
    field: EsFieldName;
    calendar_interval: string;
    missing_bucket?: boolean;
    time_zone?: string;
  };
}

export type PivotGroupBy = GenericAgg | TermsAgg | HistogramAgg | DateHistogramAgg;
export type PivotGroupByDict = Dictionary<PivotGroupBy>;
