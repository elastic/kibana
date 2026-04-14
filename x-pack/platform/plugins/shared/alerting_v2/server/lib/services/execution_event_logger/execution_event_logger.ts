/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { ServiceIdentifier } from 'inversify';

export const EVENT_LOG_PROVIDER = 'alertingV2';
export const EVENT_LOG_ACTIONS = {
  execute: 'execute',
} as const;

export interface ExecutionMetrics {
  readonly activeEpisodeCount: number;
}

export type ExecutionOutcome = 'success' | 'failure';

export interface LogExecutionParams {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly outcome: ExecutionOutcome;
  readonly durationMs: number;
  readonly message: string;
  readonly errorMessage?: string;
  readonly metrics: ExecutionMetrics | null;
}

export interface ExecutionEventLoggerContract {
  logExecution(params: LogExecutionParams): void;
}

export const ExecutionEventLoggerToken = Symbol.for(
  'alerting_v2.ExecutionEventLogger'
) as ServiceIdentifier<ExecutionEventLoggerContract>;

const MS_TO_NS = 1_000_000;

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

export class ExecutionEventLogger implements ExecutionEventLoggerContract {
  constructor(private readonly eventLogger: IEventLogger) {}

  public logExecution({
    ruleId,
    spaceId,
    scheduledAt,
    outcome,
    durationMs,
    message,
    errorMessage,
    metrics,
  }: LogExecutionParams): void {
    const now = Date.now();
    const startMs = now - durationMs;

    this.eventLogger.logEvent({
      '@timestamp': new Date(now).toISOString(),
      event: {
        action: EVENT_LOG_ACTIONS.execute,
        provider: EVENT_LOG_PROVIDER,
        outcome,
        duration: durationMs * MS_TO_NS,
        start: new Date(startMs).toISOString(),
        end: new Date(now).toISOString(),
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              metrics: metrics
                ? {
                    alert_counts: {
                      active: metrics.activeEpisodeCount,
                      new: 0,
                      recovered: 0,
                    },
                  }
                : undefined,
            },
          },
        },
        alerting: {
          instance_id: ruleId,
        },
        space_ids: [spaceId],
        task: {
          scheduled: scheduledAt,
        },
      },
      message,
      ...(errorMessage ? { error: { message: errorMessage } } : {}),
    });
  }
}
