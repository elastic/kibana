/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkGetRulesResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { BULK_OPERATION_REQUEST, RULE_RESPONSE } from './rule_oas_shared_examples';

export const BULK_GET_RULES_RESPONSE: BulkGetRulesResponse = {
  items: [RULE_RESPONSE],
  errors: [
    {
      id: 'rule-id-2',
      error: {
        code: 'RULE_NOT_FOUND',
        message: 'Rule with id "rule-id-2" not found',
        details: { rule_id: 'rule-id-2' },
      },
    },
  ],
};

const INVALID_BULK_GET_RULES_RESPONSE = invalidResponseExample({
  summary: 'Request body is missing required rule ids',
  message: 'ids: Required',
  details: { errors: { ids: ['Required'] } },
});

export const bulkGetRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkGetRulesRequest',
      summary: 'Fetch two rules by ID',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkGetRulesResponse',
        summary: 'Returned one rule and reported the other id as not found',
        value: BULK_GET_RULES_RESPONSE,
      },
      400: INVALID_BULK_GET_RULES_RESPONSE,
    },
  });
