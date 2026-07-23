/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleOas, type AlertingOasOperationObject } from '../oas_utils';
import {
  BULK_OPERATION_REQUEST,
  BULK_OPERATION_RESPONSE,
  INVALID_BULK_OPERATION_RESPONSE,
} from './rule_oas_shared_examples';

export const bulkEnableRulesOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkEnableRulesRequest',
      summary: 'Enable two rules by ID',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkEnableRulesResponse',
        summary: 'Enabled both requested rules',
        value: BULK_OPERATION_RESPONSE,
      },
      400: INVALID_BULK_OPERATION_RESPONSE,
    },
  });
