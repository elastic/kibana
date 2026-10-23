/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyCatalog } from '../../dispatcher/state';

/** Discriminator value for {@link DispatcherExecutionCompletedEvent}. */
export const DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE = 'dispatcher.execution.completed' as const;

/**
 * A workflow the dispatcher scheduled for one action group, with everything a
 * consumer needs so it does not have to query the dispatcher state again.
 */
export interface DispatchedWorkflow {
  readonly workflowId: string;
  readonly actionPolicyId: string;
  readonly workflowExecutionId: string;
  readonly spaceId: string;
  readonly ruleIds: readonly string[];
  readonly alertCount: number;
  readonly throttleStrategy: ReturnType<PolicyCatalog['throttleStrategyOf']>;
  readonly groupingMode: ReturnType<PolicyCatalog['groupingModeOf']>;
}

/**
 * Payload of {@link DispatcherExecutionCompletedEvent}.
 *
 * Unlike the rule executor events this one is not minimal: it carries every
 * delivery of the tick, already resolved, so subscribers can iterate without
 * reaching back into the dispatcher.
 */
export interface DispatcherExecutionCompletedPayload {
  readonly deliveries: readonly DispatchedWorkflow[];
}

/**
 * Domain event published on the alerting bus once per dispatcher tick that ran
 * to completion and scheduled at least one workflow. Halted and aborted ticks,
 * and ticks without deliveries, do NOT publish it.
 */
export interface DispatcherExecutionCompletedEvent {
  readonly type: typeof DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE;
  readonly payload: DispatcherExecutionCompletedPayload;
}

/** Discriminated union of every domain event published by the dispatcher. */
export type DispatcherEvent = DispatcherExecutionCompletedEvent;
