/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';

export const GET_RULE_EXECUTIONS_RESPONSE: GetRuleExecutionsResponse = {
  items: [
    {
      id: 'execution-1',
      rule: { id: 'rule-1', version: 3 },
      spaceId: 'default',
      startedAt: '2026-01-15T12:00:00.000Z',
      endedAt: '2026-01-15T12:00:01.250Z',
      timings: { duration: 1250, scheduledDelay: 40 },
      outcome: 'success',
      reason: null,
      error: null,
    },
  ],
  total: 1,
  page: 1,
  perPage: 20,
};

// Mirrors the page * perPage refinement message in getRuleExecutionsQuerySchema.
const INVALID_RULE_EXECUTIONS_QUERY_RESPONSE = invalidResponseExample({
  summary: 'Exceeds the max result window',
  message: 'page * perPage cannot exceed 10000.',
  details: { errors: { page: ['page * perPage cannot exceed 10000.'] } },
});

export const getRuleExecutionsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'getRuleExecutionsResponse',
        summary: 'One successful rule execution',
        value: GET_RULE_EXECUTIONS_RESPONSE,
      },
      400: INVALID_RULE_EXECUTIONS_QUERY_RESPONSE,
    },
  });
