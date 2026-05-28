/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadVariable } from './types';

// Mirrors `ActionPolicyWorkflowPayload` from server/lib/dispatcher/types.ts.
// These are the children of `context.inputs` at workflow render time — scheduleWorkflow
// wraps non-`event` payload fields under `inputs`, so templates use `{{ inputs.policyId }}`, etc.
// Keep in sync when the dispatcher payload changes.
export const DISPATCH_PAYLOAD_VARIABLES: readonly PayloadVariable[] = [
  {
    path: 'id',
    detail: 'string',
    documentation: 'Action group id (unique per dispatch).',
  },
  {
    path: 'policyId',
    detail: 'string',
    documentation: 'Action policy id that produced this dispatch.',
  },
  {
    path: 'groupKey',
    detail: 'Record<string, unknown>',
    documentation: 'Map of grouping field values for the dispatched group.',
  },
  {
    path: 'episodes',
    detail: 'AlertEpisode[]',
    documentation: 'Alert episodes included in this dispatch.',
  },
];

// Mirrors `AlertEpisode` from server/lib/dispatcher/types.ts — keep in sync.
export const ALERT_EPISODE_FIELDS: readonly PayloadVariable[] = [
  {
    path: 'last_event_timestamp',
    detail: 'string',
    documentation: 'Timestamp of the most recent event in this episode.',
  },
  {
    path: 'rule_id',
    detail: 'string',
    documentation: 'ID of the rule that produced this episode.',
  },
  {
    path: 'group_hash',
    detail: 'string',
    documentation: 'Hash identifying the alert group.',
  },
  {
    path: 'episode_id',
    detail: 'string',
    documentation: 'Unique identifier for this episode.',
  },
  {
    path: 'episode_status',
    detail: "'inactive' | 'pending' | 'active' | 'recovering'",
    documentation: 'Current lifecycle status of the episode.',
  },
  {
    path: 'data',
    detail: 'Record<string, unknown>',
    documentation:
      'Additional alert/event data attached to the episode. Arbitrary Record<string, unknown> — field autocomplete is not available inside `data`.',
  },
];
