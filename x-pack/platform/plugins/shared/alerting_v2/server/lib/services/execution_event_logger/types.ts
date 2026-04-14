/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ExecutionMetrics {
  readonly activeEpisodeCount: number;
}

export type ExecutionOutcome = 'success' | 'failure';

export interface LogExecutionParams {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly outcome: ExecutionOutcome;
  readonly startMs: number;
  readonly endMs: number;
  readonly message: string;
  readonly errorMessage?: string;
  readonly metrics: ExecutionMetrics | null;
}

export interface ExecutionEventLoggerContract {
  logExecution(params: LogExecutionParams): void;
}

/**
 * Shape of the event log documents written by ExecutionEventLogger.
 * Used by ExecutionLogService to read execution history with type safety.
 */
export interface ExecutionEventSource {
  '@timestamp': string;
  event: {
    provider: string;
    action: string;
    outcome: string;
    duration: number;
    start: string;
    end: string;
  };
  kibana: {
    alert: {
      rule: {
        execution: {
          metrics?: {
            alert_counts?: {
              active?: number;
              new?: number;
              recovered?: number;
            };
          };
        };
      };
    };
    alerting: {
      instance_id: string;
    };
    space_ids: string[];
    task: {
      scheduled: string;
    };
  };
  message: string;
  error?: {
    message?: string;
  };
}
