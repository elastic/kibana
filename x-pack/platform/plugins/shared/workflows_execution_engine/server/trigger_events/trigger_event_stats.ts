/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Counts along the subscription -> match funnel for one emit. */
export interface TriggerResolutionStats {
  subscribedCount: number;
  disabledCount: number;
  connectorIdMismatchCount: number;
  kqlFalseCount: number;
  kqlErrorCount: number;
  matchedCount: number;
}

/** Scheduling outcomes after KQL-matched workflows are considered. */
export interface TriggerEventScheduleStats {
  depthSkippedCount: number;
  /** Matched workflows skipped because `on.workflowEvents: ignore` and the emit was workflow-attributed. */
  workflowEventsIgnoreSkippedCount: number;
  /** Matched workflows skipped by the event-chain cycle guard (typically `on.workflowEvents: avoid-loop` or omitted). */
  workflowEventsCycleSkippedCount: number;
  scheduledAttemptCount: number;
  scheduledSuccessCount: number;
  scheduledFailureCount: number;
}

export const createEmptyTriggerResolutionStats = (): TriggerResolutionStats => ({
  subscribedCount: 0,
  disabledCount: 0,
  connectorIdMismatchCount: 0,
  kqlFalseCount: 0,
  kqlErrorCount: 0,
  matchedCount: 0,
});

export const createEmptyTriggerScheduleStats = (): TriggerEventScheduleStats => ({
  depthSkippedCount: 0,
  workflowEventsIgnoreSkippedCount: 0,
  workflowEventsCycleSkippedCount: 0,
  scheduledAttemptCount: 0,
  scheduledSuccessCount: 0,
  scheduledFailureCount: 0,
});
