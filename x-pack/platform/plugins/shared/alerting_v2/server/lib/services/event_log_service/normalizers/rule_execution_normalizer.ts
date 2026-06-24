/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../../../rule_executor/constants';
import type { RuleExecution, RuleExecutionError, RuleExecutionOutcome } from '../types';

const TASK_ID_SEGMENT_COUNT = 4;
const [TASK_ID_TYPE_NAMESPACE, TASK_ID_TYPE_NAME] = ALERTING_RULE_EXECUTOR_TASK_TYPE.split(':');

/**
 * `nanosToMillis` accepts `string | number` but rejects empty strings and
 * arbitrary input. We narrow to the values it can safely consume; anything
 * else falls back to `0` ms at the call site.
 */
const toNsOrZero = (value: unknown): string | number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0 && Number.isFinite(Number(value))) {
    return value;
  }
  return 0;
};

const isRuleExecutionOutcome = (value: unknown): value is RuleExecutionOutcome =>
  value === 'success' || value === 'failure';

/**
 * Projects a raw `task-run` event into a {@link RuleExecution}.
 *
 * `id` is the Elasticsearch document `_id` of the underlying event-log
 * record. The event log auto-generates it at write time (Task Manager
 * does not pass one to `eventLogger.logEvent`), so it is unique per run,
 * opaque, and stable across reads — properties a per-run identifier
 * needs without us inventing one. When the rule executor eventually
 * emits its own provider events (future Option C in the spec), this
 * function will switch to reading the executor-assigned UUID from the
 * document body without changing the public shape.
 *
 * Returns `null` when the event is structurally unfit (missing hit id,
 * malformed `kibana.task.id`, missing `event.start`, unrecognized
 * `event.outcome`). These should not occur in practice given the
 * upstream filter on `kibana.task.type`, but defensive null-returns
 * keep the normalizer total and let the read path fail-soft on bad data.
 */
export const normalizeRuleExecution = (
  id: string | undefined,
  raw: IValidatedEvent
): RuleExecution | null => {
  if (!id) {
    return null;
  }

  const taskId = raw?.kibana?.task?.id;
  if (!taskId) {
    return null;
  }

  const segments = taskId.split(':');
  if (
    segments.length !== TASK_ID_SEGMENT_COUNT ||
    segments[0] !== TASK_ID_TYPE_NAMESPACE ||
    segments[1] !== TASK_ID_TYPE_NAME
  ) {
    return null;
  }

  const [, , spaceId, ruleId] = segments;

  const startedAt = raw.event?.start;
  const endedAt = raw.event?.end;

  if (!startedAt || !endedAt) {
    return null;
  }

  const outcome = raw.event?.outcome;

  if (!isRuleExecutionOutcome(outcome)) {
    return null;
  }

  return {
    id,
    rule: { id: ruleId },
    spaceId,
    startedAt,
    endedAt,
    timings: {
      duration: nanosToMillis(toNsOrZero(raw.event?.duration)),
      scheduledDelay: nanosToMillis(toNsOrZero(raw.kibana?.task?.schedule_delay)),
    },
    outcome,
    reason: raw.event?.reason ?? null,
    error: toError(raw),
  };
};

/**
 * Projects `error.message` / `error.stack_trace` into the domain shape.
 *
 * Returns `null` when the source did not record a `message` — both for
 * successful runs and for failures Task Manager could not classify. We
 * key on `message` (not on `outcome === 'failure'`) so that callers can
 * trust `error !== null ⇒ message present`.
 */
const toError = (raw: NonNullable<IValidatedEvent>): RuleExecutionError | null => {
  const message = raw.error?.message;
  if (typeof message !== 'string' || message.length === 0) return null;

  return {
    message,
    stackTrace: raw.error?.stack_trace ?? null,
  };
};
