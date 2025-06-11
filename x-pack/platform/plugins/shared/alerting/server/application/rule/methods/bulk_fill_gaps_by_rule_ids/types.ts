/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type BulkGapsFillStep =
  | 'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION'
  | 'BULK_GAPS_FILL_STEP_SCHEDULING';

export interface BulkGapFillingErroredRule {
  rule: {
    id: string;
    name: string;
  };
  step: BulkGapsFillStep;
  errorMessage: string;
}

interface RuleToBackfill {
  id: string;
  name: string;
  alertTypeId: string;
  consumer: string;
}

export interface BulkFillGapsByRuleIdsParams {
  rules: RuleToBackfill[];
  range: {
    start: string;
    end: string;
  };
}

export interface BulkFillGapsByRuleIdsResult {
  backfilled: RuleToBackfill[];
  skipped: RuleToBackfill[];
  errored: BulkGapFillingErroredRule[];
}
