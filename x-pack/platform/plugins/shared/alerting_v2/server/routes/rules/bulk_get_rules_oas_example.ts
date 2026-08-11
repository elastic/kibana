/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkGetRulesParams, BulkGetRulesResponse } from '@kbn/alerting-v2-schemas';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { RULE_RESPONSE } from './rule_oas_shared_examples';

export const BULK_GET_RULES_REQUEST: BulkGetRulesParams = {
  ids: ['rule-1', 'rule-2'],
};

export const BULK_GET_RULES_RESPONSE: BulkGetRulesResponse = {
  rules: [RULE_RESPONSE],
};

const INVALID_BULK_GET_RULES_RESPONSE = invalidResponseExample({
  summary: 'Request body is missing required rule ids',
  message: 'ids: Required',
  details: { errors: { ids: ['Required'] } },
});

// Bulk-get rethrows the raw SO Boom; onError derives `NOT_FOUND` + SO message.
const RULES_NOT_FOUND_RESPONSE = {
  name: 'rulesNotFound',
  summary: 'One or more requested rule ids could not be found',
  value: {
    code: 'NOT_FOUND',
    error: 'Not Found',
    message: `Saved object [${RULE_SAVED_OBJECT_TYPE}/${RULE_RESPONSE.id}] not found`,
  },
};

export const bulkGetRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
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
