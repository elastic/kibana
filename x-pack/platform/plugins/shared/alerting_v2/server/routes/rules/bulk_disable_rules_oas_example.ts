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
  RULE_RESPONSE,
  buildRuleOas,
} from './rule_oas_shared';

export const bulkDisableRulesOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkDisableRulesRequest',
      summary: 'Disable two rules by ID',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkDisableRulesResponse',
        summary: 'Disabled both requested rules',
        value: {
          ...BULK_OPERATION_RESPONSE,
          rules: [{ ...RULE_RESPONSE, enabled: false }],
        },
      },
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });
