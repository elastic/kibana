/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadVariable } from './types';

// Mirrors `ActionPolicyWorkflowPayload` from
// server/lib/dispatcher/types.ts — keep in sync when the dispatcher payload changes.
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
