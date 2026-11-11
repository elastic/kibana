/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `event.provider` written on every alerting v2 event-log document, and the
 * value the read queries and telemetry stats filter on.
 */
export const ACTION_POLICY_EVENT_PROVIDER = 'alerting_v2' as const;

/**
 * `event.action` values for action-policy dispatch events. Written by the
 * dispatcher and read back by the execution-history and telemetry queries.
 */
export const ACTION_POLICY_EVENT_ACTIONS = {
  DISPATCHED: 'dispatched',
  THROTTLED: 'throttled',
  UNMATCHED: 'unmatched',
  DISPATCH_FAILED: 'dispatch_failed',
} as const;

export type ActionPolicyEventAction =
  (typeof ACTION_POLICY_EVENT_ACTIONS)[keyof typeof ACTION_POLICY_EVENT_ACTIONS];
