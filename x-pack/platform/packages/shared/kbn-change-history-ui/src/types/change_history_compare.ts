/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryDetail } from './change_history_detail';
import type { ChangeHistoryComparisonType } from '../telemetry/types';

export type { ChangeHistoryComparisonType };
export type { ChangeHistoryCompareRowOverride } from './change_history_compare_override';

export interface ChangeHistoryCompareEndpoints {
  comparisonType: ChangeHistoryComparisonType;
  baselineChangeId: string;
  targetChangeId: string;
}

export interface ChangeHistoryCompareSpec {
  comparisonType: ChangeHistoryComparisonType;
  baseline: ChangeHistoryDetail;
  target: ChangeHistoryDetail;
}
