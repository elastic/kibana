/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  BULK_GET_RULES_REQUEST,
  BULK_GET_RULES_RESPONSE,
  RULES_NOT_FOUND_RESPONSE,
  buildRuleOas,
  invalidResponseExample,
} from './rule_oas_shared';

const INVALID_BULK_GET_RULES_RESPONSE = invalidResponseExample({
  summary: 'Request body is missing required rule ids',
  message: 'ids: Required',
  details: { errors: { ids: ['Required'] } },
});

export const bulkGetRulesOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkGetRulesRequest',
      summary: 'Fetch two rules by ID',
      value: BULK_GET_RULES_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkGetRulesResponse',
        summary: 'Returned the requested rules',
        value: BULK_GET_RULES_RESPONSE,
      },
      400: INVALID_BULK_GET_RULES_RESPONSE,
      404: RULES_NOT_FOUND_RESPONSE,
    },
  });
