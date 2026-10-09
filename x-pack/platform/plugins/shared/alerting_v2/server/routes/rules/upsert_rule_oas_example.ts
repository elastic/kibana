/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { getRuleVersionConflictMessage } from '../../lib/errors/rule_error_messages';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  CREATE_RULE_REQUEST,
  RULE_NOT_FOUND_RESPONSE,
  RULE_RESPONSE,
  ruleResponseExample,
} from './rule_oas_shared_examples';

const INVALID_UPSERT_RULE_RESPONSE = invalidResponseExample({
  summary: 'Upsert body is missing required rule metadata',
  message: 'metadata: Required',
  details: { errors: { metadata: ['Required'] } },
});

const RULE_UPSERT_CONFLICT_RESPONSE = {
  name: 'ruleVersionConflict',
  summary: 'Rule was changed concurrently by another caller',
  value: {
    code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT,
    error: 'Conflict',
    message: getRuleVersionConflictMessage(RULE_RESPONSE.id),
    details: { rule_id: RULE_RESPONSE.id },
  },
};

export const upsertRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'upsertRuleRequest',
      summary: 'Create or replace a host CPU threshold rule',
      value: CREATE_RULE_REQUEST,
    },
    responses: {
      200: ruleResponseExample('upsertRuleReplacedResponse', 'Replaced an existing rule'),
      201: ruleResponseExample('upsertRuleCreatedResponse', 'Created a new rule with the given ID'),
      400: INVALID_UPSERT_RULE_RESPONSE,
      404: RULE_NOT_FOUND_RESPONSE,
      409: RULE_UPSERT_CONFLICT_RESPONSE,
    },
  });
