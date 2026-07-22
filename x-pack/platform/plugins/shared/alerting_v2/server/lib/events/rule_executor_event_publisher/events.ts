/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Discriminator value for {@link RuleExecutionEvent}. */
export const RULE_EXECUTION_COMPLETED_EVENT_TYPE = 'rule.execution.completed' as const;

/**
 * Payload of {@link RuleExecutionEvent}.
 */
export interface RuleExecutionCompletedPayload {
  readonly executionId: string;
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly counters: Readonly<Record<string, number>>;
}

/**
 * Domain event published on the alerting bus after every pipeline run.
 *
 * Fires once per {@link RuleExecutionPipeline.execute} call from the `finally`
 * block, so it is emitted for successful runs, halted runs, and thrown runs
 * alike.
 */
export interface RuleExecutionEvent {
  readonly type: typeof RULE_EXECUTION_COMPLETED_EVENT_TYPE;
  readonly payload: RuleExecutionCompletedPayload;
}
