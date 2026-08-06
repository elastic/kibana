/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ACTION_POLICY_EVENT_PROVIDER = 'alerting_v2' as const;

export const ACTION_POLICY_EVENT_ACTIONS = {
  DISPATCHED: 'dispatched',
  THROTTLED: 'throttled',
  UNMATCHED: 'unmatched',
  DISPATCH_FAILED: 'dispatch_failed',
} as const;

export type ActionPolicyEventAction =
  (typeof ACTION_POLICY_EVENT_ACTIONS)[keyof typeof ACTION_POLICY_EVENT_ACTIONS];

/**
 * Machine-readable causes for a failed action-group → workflow dispatch. Stored
 * as `kibana.alerting_v2.dispatcher.failure_reason` on `dispatch_failed` events
 * so failures can be grouped without parsing the free-form `error.message`.
 */
export const DISPATCH_FAILURE_REASONS = {
  /** The policy had no decrypted API key, so the whole group was skipped. */
  MISSING_API_KEY: 'missing_api_key',
  /** The destination workflow id could not be resolved. */
  WORKFLOW_NOT_FOUND: 'workflow_not_found',
  /** The destination workflow exists but is disabled. */
  WORKFLOW_DISABLED: 'workflow_disabled',
  /** Scheduling the workflow execution threw (e.g. Task Manager error). */
  SCHEDULE_ERROR: 'schedule_error',
} as const;

export type DispatchFailureReason =
  (typeof DISPATCH_FAILURE_REASONS)[keyof typeof DISPATCH_FAILURE_REASONS];
