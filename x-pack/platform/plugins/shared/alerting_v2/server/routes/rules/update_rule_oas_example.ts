/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { getInvalidRuleDataMessage } from '../../lib/errors/rule_error_messages';
import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  RULE_RESPONSE,
  UPDATED_RULE_DESCRIPTION,
  UPDATED_RULE_NAME,
  UPDATE_RULE_REQUEST,
  buildRuleOas,
  invalidResponseExample,
  ruleResponseExample,
} from './rule_oas_shared';

const INVALID_UPDATE_RULE_RESPONSE = invalidResponseExample({
  summary: 'Update body includes an unrecognized field',
  code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
  message: getInvalidRuleDataMessage(
    'update',
    "Unrecognized key(s) in object: 'unknownField'"
  ),
  details: { context: 'update', errors: { unknownField: ['Unrecognized key'] } },
});

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
      400: INVALID_UPDATE_RULE_RESPONSE,
    },
    errors: [404, 409],
  });
