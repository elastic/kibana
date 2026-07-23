/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListPolicyExecutionHistoryResponse } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_RESPONSE } from './action_policy_oas_shared_examples';
import { buildActionPolicyOas } from './oas_utils';

export const LIST_EXECUTION_HISTORY_RESPONSE: ListPolicyExecutionHistoryResponse = {
  items: [
    {
      '@timestamp': '2026-01-15T12:05:00.000Z',
      policy: { id: 'action-policy-1', name: 'Notify on host alerts' },
      outcome: 'dispatched',
      episode_count: 1,
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

export const listActionPolicyExecutionHistoryOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'listActionPolicyExecutionHistoryResponse',
        summary: 'A page of execution history events',
        value: LIST_EXECUTION_HISTORY_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
    },
  });
