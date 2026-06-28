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

/**
 * Task id layout: `<TASK_ID_TYPE_NAMESPACE>:<TASK_ID_TYPE_NAME>:<spaceId>:<ruleId>`.
 *
 * Rule ids are user-supplied (`CreateRuleParams.id` accepts an arbitrary
 * string) and may legally contain `:`. Space ids cannot (Kibana restricts
 * them to `^[a-z0-9_-]+$`). So we anchor the parse on the *prefix* — the
 * first three segments are fixed-shape (namespace, name, spaceId) — and
 * fold everything past the third `:` back into the rule id.
 */
const TASK_ID_PREFIX_SEGMENT_COUNT = 3;
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

/**
 * `event.outcome` values our domain enum recognizes. Anything outside
 * the set (a hypothetical ECS / Task Manager extension) collapses to
 * `'unknown'` at projection time — see {@link toOutcome}.
 */
const KNOWN_OUTCOMES = new Set<RuleExecutionOutcome>(['success', 'failure', 'unknown']);

/**
 * Projects a raw `task-run` event into a {@link RuleExecution}.
 *
 * `id` is the Elasticsearch document `_id` of the underlying event-log
 * record. The event log auto-generates it at write time (Task Manager
 * does not pass one to `eventLogger.logEvent`), so it is unique per run,
 * opaque, and stable across reads — properties a per-run identifier
 * needs without us inventing one. When the rule executor eventually
 * emits its own provider events, this
 * function will switch to reading the executor-assigned UUID from the
 * document body without changing the public shape.
 *
 * Returns `null` only when the event is *structurally* unfit (missing
 * hit id, malformed `kibana.task.id`, missing `event.start` /
 * `event.end`). `event.outcome` is **not** treated as structural —
 * out-of-set values map to `'unknown'` rather than dropping the row, so
 * a future ECS / Task Manager outcome value cannot silently disappear
 * from the user's execution history.
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
    segments.length <= TASK_ID_PREFIX_SEGMENT_COUNT ||
    segments[0] !== TASK_ID_TYPE_NAMESPACE ||
    segments[1] !== TASK_ID_TYPE_NAME
  ) {
    return null;
  }

  const spaceId = segments[2];
  const ruleId = segments.slice(TASK_ID_PREFIX_SEGMENT_COUNT).join(':');

  if (ruleId.length === 0) {
    return null;
  }

  const startedAt = raw.event?.start;
  const endedAt = raw.event?.end;

  if (!startedAt || !endedAt) {
    return null;
  }

  return {
    id,
    rule: { id: ruleId, version: null },
    spaceId,
    startedAt,
    endedAt,
    timings: {
      duration: nanosToMillis(toNsOrZero(raw.event?.duration)),
      scheduledDelay: nanosToMillis(toNsOrZero(raw.kibana?.task?.schedule_delay)),
    },
    outcome: toOutcome(raw.event?.outcome),
    reason: raw.event?.reason ?? null,
    error: toError(raw),
  };
};

/**
 * Projects the raw ECS `event.outcome` into the domain enum. Falls back
 * to `'unknown'` rather than rejecting so we don't lose execution rows
 * if Task Manager / ECS ever broaden the vocabulary.
 */
const toOutcome = (raw: unknown): RuleExecutionOutcome => {
  return KNOWN_OUTCOMES.has(raw as RuleExecutionOutcome)
    ? (raw as RuleExecutionOutcome)
    : 'unknown';
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
