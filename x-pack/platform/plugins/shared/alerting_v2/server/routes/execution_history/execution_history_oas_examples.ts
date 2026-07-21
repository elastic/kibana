/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { ErrorResponse, GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import { RULE_EXECUTIONS_MAX_RESULT_WINDOW } from '@kbn/alerting-v2-schemas';
import { jsonExample } from '../json_oas_example';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

const RULE_EXECUTIONS_RESPONSE: GetRuleExecutionsResponse = {
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

const INVALID_QUERY_ERROR: ErrorResponse = {
  code: 'BAD_REQUEST',
  error: 'Bad Request',
  message: `page * perPage cannot exceed ${RULE_EXECUTIONS_MAX_RESULT_WINDOW}.`,
  details: { errors: { page: [`page * perPage cannot exceed ${RULE_EXECUTIONS_MAX_RESULT_WINDOW}.`] } },
};

export const getRuleExecutionsOasExamples = (): OASOperationObject => ({
  responses: {
    200: jsonExample(
      'getRuleExecutionsResponse',
      'Paginated rule execution events',
      RULE_EXECUTIONS_RESPONSE
    ),
    400: jsonExample('invalidRuleExecutionsQuery', 'Invalid query parameters', INVALID_QUERY_ERROR),
  },
});
