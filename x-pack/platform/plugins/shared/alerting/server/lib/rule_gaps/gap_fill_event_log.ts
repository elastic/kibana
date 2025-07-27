/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GAP_FILL_EVENT_LOG_ACTIONS = {
  executeComplete: 'execute-complete',
  executeError: 'execute-error',
} as const;

export type GapFillEventLogAction =
  (typeof GAP_FILL_EVENT_LOG_ACTIONS)[keyof typeof GAP_FILL_EVENT_LOG_ACTIONS];

export interface GapFillEventLogData {
  execution: {
    status: 'success' | 'error';
    start: string;
    end: string;
    duration_ms: number;
    config: {
      name: string;
      amountOfGapsToProcessPerRun: number;
      amountOfRetries: number;
      excludeRuleIds: string[];
      schedule: {
        interval: string;
      };
    };
    results: Array<{
      ruleId: string;
      processedGaps: number;
      status: 'success' | 'error';
      error?: string;
    }>;
    summary: {
      totalRules: number;
      successfulRules: number;
      failedRules: number;
      totalGapsProcessed: number;
    };
  };
}
