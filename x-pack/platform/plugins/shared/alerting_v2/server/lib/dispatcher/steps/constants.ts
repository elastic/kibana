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
} as const;

export type ActionPolicyEventAction =
  (typeof ACTION_POLICY_EVENT_ACTIONS)[keyof typeof ACTION_POLICY_EVENT_ACTIONS];
