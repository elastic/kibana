/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { ErrorResponse, GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import {
  RULE_EXECUTIONS_MAX_PER_PAGE,
  RULE_EXECUTIONS_MAX_RESULT_WINDOW,
  getRuleExecutionsQuerySchema,
} from '@kbn/alerting-v2-schemas';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import { jsonExample } from '../json_oas_example';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_response_descriptions';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

export const GET_RULE_EXECUTIONS_SUMMARY = 'List rule executions';

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

const invalidQueryParse = getRuleExecutionsQuerySchema.safeParse({
  page: RULE_EXECUTIONS_MAX_RESULT_WINDOW / RULE_EXECUTIONS_MAX_PER_PAGE + 1,
  perPage: RULE_EXECUTIONS_MAX_PER_PAGE,
});

if (invalidQueryParse.success) {
  throw new Error('expected getRuleExecutionsQuerySchema parse to fail for OAS example');
}

const INVALID_QUERY_ERROR: ErrorResponse = {
  code: 'BAD_REQUEST',
  error: 'Bad Request',
  message: stringifyZodError(invalidQueryParse.error),
  details: { errors: treeifyError(invalidQueryParse.error) },
};

export const getRuleExecutionsOasExamples = (): OASOperationObject => ({
  responses: {
    200: jsonExample(
      'getRuleExecutionsResponse',
      GET_RULE_EXECUTIONS_SUMMARY,
      RULE_EXECUTIONS_RESPONSE
    ),
    400: jsonExample(
      'invalidRuleExecutionsQuery',
      INVALID_QUERY_PARAMETERS_DESCRIPTION,
      INVALID_QUERY_ERROR
    ),
  },
});
