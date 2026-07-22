/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  BULK_OPERATION_REQUEST,
  BULK_OPERATION_RESPONSE,
  INVALID_RULE_DATA_EXAMPLE,
  buildRuleOas,
} from './rule_oas_shared';

export const bulkDeleteRulesOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkDeleteRulesRequest',
      summary: 'Delete two rules by ID',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkDeleteRulesResponse',
        summary: 'Deleted both requested rules',
        value: BULK_OPERATION_RESPONSE,
      },
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });
