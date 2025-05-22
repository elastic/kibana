/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResults } from '../../../backfill/methods/schedule/types';

export type BulkGapsFillStep =
  | 'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION'
  | 'BULK_GAPS_FILL_STEP_GAPS_RESOLUTION'
  | 'BULK_GAPS_FILL_STEP_SCHEDULING';

export interface BulkGapFillingErroredRule {
  rule: {
    id: string;
    name: string;
  };
  step: BulkGapsFillStep;
  errorMessage: string;
}

export interface BulkGapFillingSkippedRule {
  id: string;
  name: string;
}

export interface BulkFillGapsByRuleIdsParams {
  rules: Array<{
    id: string;
    name: string;
    alertTypeId: string;
    consumer: string;
  }>;
  range: {
    start: string;
    end: string;
  };
}

export interface BulkFillGapsByRuleIdsResult {
  outcomes: ScheduleBackfillResults[];
  skipped: BulkGapFillingSkippedRule[];
  errored: BulkGapFillingErroredRule[];
}
