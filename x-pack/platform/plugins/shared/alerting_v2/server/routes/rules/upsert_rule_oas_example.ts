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
  RULE_UPSERT_CONFLICT_RESPONSE,
  buildRuleOas,
  invalidResponseExample,
  ruleResponseExample,
} from './rule_oas_shared';

const INVALID_UPSERT_RULE_RESPONSE = invalidResponseExample({
  summary: 'Upsert body is missing required rule metadata',
  code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
  message: getInvalidRuleDataMessage('upsert', 'metadata: Required'),
  details: { context: 'upsert', errors: { metadata: ['Required'] } },
});

export const upsertRuleOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'upsertRuleRequest',
      summary: 'Create or replace a host CPU threshold rule',
      value: CREATE_RULE_REQUEST,
    },
    responses: {
      200: ruleResponseExample('upsertRuleReplacedResponse', 'Replaced an existing rule'),
      201: ruleResponseExample('upsertRuleCreatedResponse', 'Created a new rule with the given ID'),
      400: INVALID_UPSERT_RULE_RESPONSE,
      409: RULE_UPSERT_CONFLICT_RESPONSE,
    },
    errors: [404],
  });
