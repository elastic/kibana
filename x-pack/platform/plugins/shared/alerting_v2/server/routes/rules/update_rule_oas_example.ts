/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  INVALID_RULE_DATA_EXAMPLE,
  RULE_RESPONSE,
  UPDATED_RULE_DESCRIPTION,
  UPDATED_RULE_NAME,
  UPDATE_RULE_REQUEST,
  buildRuleOas,
  ruleResponseExample,
} from './rule_oas_shared';

export const updateRuleOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'updateRuleRequest',
      summary: 'Update a rule name and description',
      value: UPDATE_RULE_REQUEST,
    },
    responses: {
      200: ruleResponseExample('updateRuleResponse', 'Updated rule metadata', {
        metadata: {
          ...RULE_RESPONSE.metadata,
          name: UPDATED_RULE_NAME,
          description: UPDATED_RULE_DESCRIPTION,
        },
      }),
      400: INVALID_RULE_DATA_EXAMPLE,
    },
    errors: [404, 409],
  });
