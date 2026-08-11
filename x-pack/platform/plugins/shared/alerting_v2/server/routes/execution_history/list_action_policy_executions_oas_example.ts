/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListPolicyExecutionHistoryResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';

export const LIST_ACTION_POLICY_EXECUTIONS_RESPONSE: ListPolicyExecutionHistoryResponse = {
  items: [
    {
      dispatched_at: '2026-01-15T12:05:00.000Z',
      policy: { id: 'action-policy-1', name: 'Notify on host alerts' },
      outcome: 'dispatched',
      episode_count: 1,
      episodes: [{ id: 'episode-1' }],
      action_group_count: 1,
      rules: [{ id: 'rule-1', name: 'Host CPU high' }],
      totalRuleCount: 1,
      workflows: [{ id: 'workflow-1', name: 'Notify oncall' }],
    },
  ],
  page: 1,
  perPage: 20,
  totalEvents: 1,
  searchMatches: null,
};

// Mirrors the page * per_page refinement message in listPolicyExecutionHistoryRequestSchema.
const INVALID_ACTION_POLICY_EXECUTIONS_QUERY_RESPONSE = invalidResponseExample({
  summary: 'Exceeds the max result window',
  message: 'page * per_page cannot exceed 10000.',
  details: { errors: { page: ['page * per_page cannot exceed 10000.'] } },
});

export const listActionPolicyExecutionsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'listActionPolicyExecutionsResponse',
        summary: 'A page of action policy execution events',
        value: LIST_ACTION_POLICY_EXECUTIONS_RESPONSE,
      },
      400: INVALID_ACTION_POLICY_EXECUTIONS_QUERY_RESPONSE,
    },
  });
