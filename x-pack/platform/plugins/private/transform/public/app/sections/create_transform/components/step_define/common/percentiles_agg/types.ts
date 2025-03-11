/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PivotAggsConfigWithExtra } from '../../../../../../common/pivot_aggs';

export interface PercentilesAggConfig {
  percents: number[];
  pendingPercentileInput?: string;
  errors?: ValidationResultErrorType[];
}

export type ValidationResultErrorType =
  | 'INVALID_FORMAT'
  | 'PERCENTILE_OUT_OF_RANGE'
  | 'NUMBER_TOO_PRECISE'
  | 'DUPLICATE_VALUE';

export type IPivotAggsConfigPercentiles = PivotAggsConfigWithExtra<
  PercentilesAggConfig,
  { field: string; percents: number[] }
>;

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationResultErrorType[];
}
