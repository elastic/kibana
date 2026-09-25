/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  BULK_CREATE_RULES_REQUEST,
  BULK_CREATE_RULES_RESPONSE,
  INVALID_BULK_CREATE_RULES_RESPONSE,
} from './rule_oas_shared_examples';

export const bulkCreateRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkCreateRulesRequest',
      summary: 'Create two rules, one of them disabled',
      value: BULK_CREATE_RULES_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateRulesResponse',
        summary: 'Created both requested rules',
        value: BULK_CREATE_RULES_RESPONSE,
      },
      400: INVALID_BULK_CREATE_RULES_RESPONSE,
    },
  });
