/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScheduleBackfillParams,
  ScheduleBackfillResults,
} from '../../../backfill/methods/schedule/types';

export type BulkGapsFillStep = 'ACCESS_VALIDATION' | 'RESOLVING_GAPS' | 'SCHEDULING';

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

export interface GetBackfillSchedulePayloadsParams {
  rules: Array<
    Pick<BulkFillGapsByRuleIdsParams['rules'][0], 'id' | 'name'> & {
      gapPagination: { page: number };
    }
  >;
  range: BulkFillGapsByRuleIdsParams['range'];
  maxGapPageSize: number;
}

export interface GetBackfillSchedulePayloadsResult {
  payloads: ScheduleBackfillParams;
  next: GetBackfillSchedulePayloadsParams['rules'];
  errored: BulkGapFillingErroredRule[];
}

export interface BulkFillGapsImplResult {
  outcomes: ScheduleBackfillResults[];
  skipped: BulkGapFillingSkippedRule[];
  errored: BulkGapFillingErroredRule[];
}
