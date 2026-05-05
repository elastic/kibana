/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEvent } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import type { RuleKind } from '@kbn/alerting-v2-schemas';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import {
  RULE_EXECUTION_STATUSES,
  RULE_EXECUTOR_EVENT_ACTIONS,
  type RuleExecutionReason,
  type RuleExecutionStatus,
} from './constants';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from './task_definition';
import type { RuleExecutionMetricsSnapshot } from './metrics_collector';

export type { RuleExecutionReason, RuleExecutionStatus } from './constants';

export interface RuleExecutionRuleAttributes {
  readonly id: string;
  readonly name: string;
  readonly kind: RuleKind;
  readonly tags?: readonly string[];
  readonly version?: number;
}

export interface ExecuteTaskAttributes {
  readonly id: string;
  readonly scheduled: Date;
}

export interface ExecuteStartInput {
  readonly executionUuid: string;
  readonly ruleId: string;
  readonly spaceId: string;
  readonly startedAt: Date;
  readonly task: ExecuteTaskAttributes;
}

export interface ExecuteSummaryInput {
  readonly executionUuid: string;
  readonly ruleId: string;
  readonly spaceId: string;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly task: ExecuteTaskAttributes;
  readonly status: RuleExecutionStatus;
  readonly reason?: RuleExecutionReason;
  readonly error?: { readonly message: string; readonly stackTrace?: string };
  readonly cancelled?: { readonly step?: string; readonly reason: 'timeout' };
  readonly rule?: RuleExecutionRuleAttributes;
  readonly message?: string;
  /**
   * Step-level metrics captured during the run. The `total_run_duration_ms`
   * field is computed inside the document builder from start/end timestamps;
   * everything else comes from {@link RuleExecutionMetricsCollector}.
   */
  readonly metrics?: RuleExecutionMetricsSnapshot;
}

const NS_PER_MS = 1_000_000;

function buildTaskFields(task: ExecuteTaskAttributes, startedAt: Date) {
  const scheduledMs = task.scheduled.getTime();
  const startedMs = startedAt.getTime();
  const scheduleDelayNs = Math.max(0, startedMs - scheduledMs) * NS_PER_MS;
  return {
    id: task.id,
    type: ALERTING_RULE_EXECUTOR_TASK_TYPE,
    scheduled: task.scheduled.toISOString(),
    schedule_delay: scheduleDelayNs,
  };
}

/**
 * Constructs and writes the two-event-per-run pair (`execute-start` + `execute`)
 * documented in RFC rna-program#463. Documents are written via the shared
 * `EventLogService` (fire-and-forget); construction failures are swallowed so a
 * logging issue never breaks rule execution.
 */
export class RuleExecutorEventLogger {
  constructor(private readonly eventLogService: EventLogServiceContract) {}

  public logExecuteStart(input: ExecuteStartInput): void {
    try {
      this.eventLogService.logEvent(buildExecuteStartEvent(input));
    } catch {
      // logEvent is fire-and-forget; never let a logging issue break a run
    }
  }

  public logExecute(input: ExecuteSummaryInput): void {
    try {
      this.eventLogService.logEvent(buildExecuteEvent(input));
    } catch {
      // see logExecuteStart
    }
  }
}

interface SavedObjectRef {
  type: typeof RULE_SAVED_OBJECT_TYPE;
  id: string;
  rel: typeof SAVED_OBJECT_REL_PRIMARY;
  namespace?: string;
}

function ruleRef(ruleId: string, spaceId: string): SavedObjectRef {
  return {
    type: RULE_SAVED_OBJECT_TYPE,
    id: ruleId,
    rel: SAVED_OBJECT_REL_PRIMARY,
    namespace: spaceId === 'default' ? undefined : spaceId,
  };
}

function statusToOutcome(status: RuleExecutionStatus): 'success' | 'failure' | 'unknown' {
  switch (status) {
    case RULE_EXECUTION_STATUSES.SUCCESS:
      return 'success';
    case RULE_EXECUTION_STATUSES.FAILED:
    case RULE_EXECUTION_STATUSES.TIMEOUT:
      return 'failure';
  }
}

export function buildExecuteStartEvent({
  executionUuid,
  ruleId,
  spaceId,
  startedAt,
  task,
}: ExecuteStartInput): IEvent {
  return {
    '@timestamp': startedAt.toISOString(),
    event: {
      provider: 'alerting_v2',
      action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE_START,
      start: startedAt.toISOString(),
    },
    kibana: {
      saved_objects: [ruleRef(ruleId, spaceId)],
      space_ids: [spaceId],
      task: buildTaskFields(task, startedAt),
      alerting_v2: {
        rule_executor: {
          rule: { id: ruleId },
          execution: { uuid: executionUuid },
        },
      },
    },
  };
}

export function buildExecuteEvent({
  executionUuid,
  ruleId,
  spaceId,
  startedAt,
  endedAt,
  task,
  status,
  reason,
  error,
  cancelled,
  rule,
  message,
  metrics,
}: ExecuteSummaryInput): IEvent {
  const totalRunDurationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());

  return {
    '@timestamp': endedAt.toISOString(),
    message,
    event: {
      provider: 'alerting_v2',
      action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE,
      outcome: statusToOutcome(status),
      start: startedAt.toISOString(),
      end: endedAt.toISOString(),
      duration: totalRunDurationMs * NS_PER_MS, // ECS expects nanoseconds
      ...(reason ? { reason } : {}),
    },
    ...(error
      ? {
          error: {
            message: error.message,
            ...(error.stackTrace ? { stack_trace: error.stackTrace } : {}),
          },
        }
      : {}),
    kibana: {
      saved_objects: [ruleRef(ruleId, spaceId)],
      space_ids: [spaceId],
      task: buildTaskFields(task, startedAt),
      alerting_v2: {
        rule_executor: {
          rule: {
            id: ruleId,
            ...(rule
              ? {
                  name: rule.name,
                  kind: rule.kind,
                  ...(rule.version !== undefined ? { version: rule.version } : {}),
                  ...(rule.tags ? { tags: [...rule.tags] } : {}),
                }
              : {}),
          },
          execution: {
            uuid: executionUuid,
            status,
            ...(cancelled
              ? {
                  cancelled: {
                    ...(cancelled.step ? { step: cancelled.step } : {}),
                    reason: cancelled.reason,
                  },
                }
              : {}),
            metrics: { total_run_duration_ms: totalRunDurationMs, ...(metrics ?? {}) },
          },
        },
      },
    },
  };
}
