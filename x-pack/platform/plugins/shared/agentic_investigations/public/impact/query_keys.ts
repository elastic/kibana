/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys as proposalsQueryKeys } from '@kbn/proposals-plugin/public';
import { escalationQueryKeys } from '../escalations/query_keys';

/** Under the proposals and escalations roots, so a decision or an escalation change refreshes them. */
export const impactPillsQueryKeys = {
  proposals: () => [...proposalsQueryKeys.proposals.all, 'impact-pills'] as const,
  escalations: () => escalationQueryKeys.impactPills(),
};
