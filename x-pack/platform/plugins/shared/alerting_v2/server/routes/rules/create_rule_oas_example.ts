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
  CREATE_RULE_REQUEST,
  buildRuleOas,
  invalidResponseExample,
  ruleResponseExample,
} from './rule_oas_shared';

const INVALID_CREATE_RULE_RESPONSE = invalidResponseExample({
  summary: 'Missing required rule metadata',
  code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
  message: getInvalidRuleDataMessage('create', 'metadata: Required'),
  details: { context: 'create', errors: { metadata: ['Required'] } },
});

export const createRuleOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'createRuleRequest',
      summary: 'Create a host CPU threshold rule',
      value: CREATE_RULE_REQUEST,
    },
    responses: {
      201: ruleResponseExample('createRuleResponse', 'Created host CPU threshold rule'),
      400: INVALID_CREATE_RULE_RESPONSE,
    },
  });
