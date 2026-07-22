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
  INVALID_RULE_DATA_EXAMPLE,
  RULES_NOT_FOUND_EXAMPLE,
  buildRuleOas,
} from './rule_oas_shared';

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
      400: INVALID_RULE_DATA_EXAMPLE,
      404: RULES_NOT_FOUND_EXAMPLE,
    },
  });
