/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { IEvent, IEventLogger } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RULE_EXECUTOR_EVENT_ACTIONS } from '../../rule_executor/event_log/constants';
import { EventLoggerToken } from './tokens';
import type {
  RuleAttributesSnapshot,
  RuleExecuteLogInput,
  RuleExecuteStartLogInput,
} from './rule_executor_log_inputs';

const NS_PER_MS = 1_000_000;

export interface EventLogServiceContract {
  logEvent(event: IEvent, id?: string): void;

  /**
   * Fire-and-forget write of the rule executor `execute-start` beacon.
   * Emitted immediately after task pickup, before any pipeline step runs,
   * so a later orphaned-start lookup can detect runs that crashed.
   */
  logRuleExecuteStart(input: RuleExecuteStartLogInput): void;

  /**
   * Fire-and-forget write of the rule executor `execute` summary.
   * Emitted when the pipeline completes (success, halt, thrown step, or
   * task-timeout cancellation) with the captured metrics snapshot.
   */
  logRuleExecute(input: RuleExecuteLogInput): void;
}

@injectable()
export class EventLogService implements EventLogServiceContract {
  constructor(@inject(EventLoggerToken) private readonly eventLogger: IEventLogger) {}

  public logEvent(event: IEvent, id?: string): void {
    this.eventLogger.logEvent(event, id);
  }

  public logRuleExecuteStart(input: RuleExecuteStartLogInput): void {
    this.eventLogger.logEvent(buildExecuteStartEvent(input));
  }

  public logRuleExecute(input: RuleExecuteLogInput): void {
    this.eventLogger.logEvent(buildExecuteEvent(input));
  }
}

const buildExecuteStartEvent = ({
  executionUuid,
  ruleId,
  spaceId,
  start,
}: RuleExecuteStartLogInput): IEvent => ({
  '@timestamp': start.toISOString(),
  event: {
    action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE_START,
    start: start.toISOString(),
  },
  message: `rule executor started for rule ${ruleId}`,
  kibana: {
    saved_objects: [buildRuleRef(ruleId, spaceId)],
    space_ids: [spaceId],
    alerting_v2: {
      rule_executor: {
        execution: { uuid: executionUuid },
        rule: { id: ruleId },
      },
    },
  },
});

const buildExecuteEvent = ({
  executionUuid,
  ruleId,
  spaceId,
  start,
  end,
  status,
  reason,
  error,
  metrics,
  rule,
}: RuleExecuteLogInput): IEvent => {
  const totalRunDurationMs = Math.max(0, end.getTime() - start.getTime());

  return {
    '@timestamp': end.toISOString(),
    event: {
      action: RULE_EXECUTOR_EVENT_ACTIONS.EXECUTE,
      outcome: toEcsOutcome(status),
      start: start.toISOString(),
      end: end.toISOString(),
      duration: totalRunDurationMs * NS_PER_MS,
      ...(reason != null ? { reason } : {}),
    },
    ...(error != null
      ? {
          error: {
            message: error.message,
            ...(error.stackTrace != null ? { stack_trace: error.stackTrace } : {}),
          },
        }
      : {}),
    message: `rule executor ${status} for rule ${ruleId}`,
    kibana: {
      saved_objects: [buildRuleRef(ruleId, spaceId)],
      space_ids: [spaceId],
      alerting_v2: {
        rule_executor: {
          execution: {
            uuid: executionUuid,
            status,
            metrics: {
              total_run_duration_ms: totalRunDurationMs,
              query: { ...metrics.query },
              events_written: { ...metrics.events_written },
              episodes: { ...metrics.episodes },
              recovery: {
                ...(metrics.recovery.mode != null ? { mode: metrics.recovery.mode } : {}),
                events_emitted: metrics.recovery.events_emitted,
              },
            },
            ...(metrics.cancelled != null ? { cancelled: { ...metrics.cancelled } } : {}),
          },
          rule: buildRuleAttributes(ruleId, rule),
        },
      },
    },
  };
};

const buildRuleRef = (ruleId: string, spaceId: string) => ({
  rel: SAVED_OBJECT_REL_PRIMARY,
  type: RULE_SAVED_OBJECT_TYPE,
  id: ruleId,
  ...(spaceId !== 'default' ? { namespace: spaceId } : {}),
});

const buildRuleAttributes = (ruleId: string, rule: RuleAttributesSnapshot | undefined) => {
  if (rule == null) {
    return { id: ruleId };
  }

  return {
    id: rule.id,
    ...(rule.name != null ? { name: rule.name } : {}),
    ...(rule.kind != null ? { kind: rule.kind } : {}),
    ...(rule.version != null ? { version: rule.version } : {}),
    ...(rule.tags != null ? { tags: [...rule.tags] } : {}),
    ...(rule.query != null ? { query: [...rule.query] } : {}),
  };
};

const toEcsOutcome = (status: string): 'success' | 'failure' | 'unknown' => {
  if (status === 'success') {
    return 'success';
  }
  if (status === 'failed' || status === 'timeout') {
    return 'failure';
  }
  return 'unknown';
};
