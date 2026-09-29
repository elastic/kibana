/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleBody } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  RULE_NOT_FOUND_RESPONSE,
  RULE_RESPONSE,
  RULE_VERSION_CONFLICT_RESPONSE,
  ruleResponseExample,
} from './rule_oas_shared_examples';

export const UPDATED_RULE_NAME = 'Host CPU high (updated)';
export const UPDATED_RULE_DESCRIPTION = 'Updated description.';

export const UPDATE_RULE_REQUEST: UpdateRuleBody = {
  version: 'WzAsMV0=',
  metadata: {
    name: UPDATED_RULE_NAME,
    description: UPDATED_RULE_DESCRIPTION,
  },
};

const INVALID_UPDATE_RULE_RESPONSE = invalidResponseExample({
  summary: 'Update body includes an unrecognized field',
  message: "Unrecognized key(s) in object: 'unknownField'",
  details: { errors: { unknownField: ['Unrecognized key'] } },
});

export const updateRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
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
      404: RULE_NOT_FOUND_RESPONSE,
      409: RULE_VERSION_CONFLICT_RESPONSE,
    },
  });
