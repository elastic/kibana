/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';

/** Discriminator value for {@link RuleExecutionSucceededEvent}. */
export const RULE_EXECUTION_SUCCEEDED_EVENT_TYPE = 'rule.execution.succeeded' as const;

/**
 * Payload of {@link RuleExecutionSucceededEvent}.
 *
 * Deliberately minimal: it carries the rule's identity, kind and tags plus the
 * execution correlation keys a downstream consumer needs to (a) fetch the rule
 * and (b) find the `.rule-events` this run produced via an exact-equality query
 * on `scheduled_timestamp` — without embedding event ids in the event.
 */
export interface RuleExecutionSucceededPayload {
  readonly executionId: string;
  readonly scheduledAt: string;
  readonly ruleEventsGenerated: number;
  readonly rule: {
    readonly ruleId: string;
    readonly spaceId: string;
    readonly kind: RuleKind;
    readonly tags: readonly string[];
  };
}

/**
 * Domain event published on the alerting bus after a rule execution completes
 * successfully (the pipeline ran to the end without halting or throwing).
 *
 * Emitted once per successful {@link RuleExecutionPipeline.execute} call. Halted
 * and failed runs do NOT publish this event.
 */
export interface RuleExecutionSucceededEvent {
  readonly type: typeof RULE_EXECUTION_SUCCEEDED_EVENT_TYPE;
  readonly payload: RuleExecutionSucceededPayload;
}

/** Discriminator value for {@link RuleExecutionFailedEvent}. */
export const RULE_EXECUTION_FAILED_EVENT_TYPE = 'rule.execution.failed' as const;

/**
 * Payload of {@link RuleExecutionFailedEvent}.
 */
export interface RuleExecutionFailedPayload {
  readonly rule: {
    readonly id: string;
    readonly spaceId: string;
  };
  readonly error: string;
}

/**
 * Domain event published on the alerting bus when a rule execution throws
 * (the pipeline did not run to completion).
 *
 * Emitted once per failed {@link RuleExecutionPipeline.execute} call, just
 * before the error propagates to Task Manager.
 */
export interface RuleExecutionFailedEvent {
  readonly type: typeof RULE_EXECUTION_FAILED_EVENT_TYPE;
  readonly payload: RuleExecutionFailedPayload;
}

/**
 * Discriminated union of every domain event published by the rule executor.
 *
 * Adding a new executor event (e.g. a halted outcome) is a matter of defining
 * it above and adding it here.
 */
export type RuleExecutorEvent = RuleExecutionSucceededEvent | RuleExecutionFailedEvent;
