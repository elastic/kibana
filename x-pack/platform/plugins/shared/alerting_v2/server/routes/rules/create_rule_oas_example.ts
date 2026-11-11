/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { getRuleAlreadyExistsMessage } from '../../lib/errors/rule_error_messages';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject, OasExampleEntry } from '../oas_types';
import { RULE_ALREADY_EXISTS_DESCRIPTION } from './rule_response_descriptions';
import {
  CREATE_RULE_REQUEST,
  RULE_RESPONSE,
  ruleResponseExample,
} from './rule_oas_shared_examples';

const INVALID_CREATE_RULE_RESPONSE = invalidResponseExample({
  summary: 'Missing required rule metadata',
  message: 'metadata: Required',
  details: { errors: { metadata: ['Required'] } },
});

const RULE_ALREADY_EXISTS_RESPONSE: OasExampleEntry = {
  name: 'ruleAlreadyExists',
  summary: RULE_ALREADY_EXISTS_DESCRIPTION,
  value: {
    code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
    error: 'Conflict',
    message: getRuleAlreadyExistsMessage(RULE_RESPONSE.id),
    details: { rule_id: RULE_RESPONSE.id },
  } satisfies ErrorResponse,
};

export const createRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createRuleRequest',
      summary: 'Create a host CPU threshold rule',
      value: CREATE_RULE_REQUEST,
    },
    responses: {
      201: ruleResponseExample('createRuleResponse', 'Created host CPU threshold rule'),
      400: INVALID_CREATE_RULE_RESPONSE,
      409: RULE_ALREADY_EXISTS_RESPONSE,
    },
  });
