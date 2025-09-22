/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { getGapFillAutoSchedulerLogsSchema } from '../schemas';

export type GetGapFillAutoSchedulerLogsParams = TypeOf<typeof getGapFillAutoSchedulerLogsSchema>;

export interface GapFillAutoSchedulerLogEntry {
  timestamp: string;
  status: 'success' | 'error' | 'warning' | 'skipped' | 'unknown';
  message: string;
  durationMs: number;
  summary: {
    totalRules: number;
    successfulRules: number;
    failedRules: number;
    totalGapsProcessed: number;
  };
  config: {
    name: string;
    maxAmountOfGapsToProcessPerRun: number;
    maxAmountOfRulesToProcessPerRun: number;
    amountOfRetries: number;
    rulesFilter: string;
    gapFillRange: string;
    schedule: {
      interval: string;
    };
  };
  results?: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error' | 'unknown';
    error?: string;
  }>;
}

export interface GapFillAutoSchedulerLogsResult {
  data: GapFillAutoSchedulerLogEntry[];
  total: number;
  page: number;
  perPage: number;
}
