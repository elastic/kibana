/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  BULK_GET_RULES_REQUEST,
  BULK_GET_RULES_RESPONSE,
  RULE_RESPONSE,
  buildRuleOas,
  invalidResponseExample,
} from './rule_oas_shared';

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
