/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum BulkGapsFillStep {
  ACCESS_VALIDATION = 'ACCESS_VALIDATION',
  SCHEDULING = 'SCHEDULING',
}

export enum BulkFillGapsScheduleResult {
  BACKFILLED = 'BACKFILLED',
  SKIPPED = 'SKIPPED',
  ERRORED = 'ERRORED',
}

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

export interface BulkFillGapsByRuleIdsOptions {
  maxGapCountPerRule: number;
  maxBackfillConcurrency?: number;
}

export interface BulkFillGapsByRuleIdsResult {
  backfilled: RuleToBackfill[];
  skipped: RuleToBackfill[];
  errored: BulkGapFillingErroredRule[];
}

export enum GapFillSchedulePerRuleStatus {
  ERROR = 'error',
  SUCCESS = 'success',
}
