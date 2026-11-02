/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { CREATE_RULE_REQUEST, ruleResponseExample } from './rule_oas_shared_examples';

const INVALID_CREATE_RULE_RESPONSE = invalidResponseExample({
  summary: 'Missing required rule metadata',
  message: 'metadata: Required',
  details: { errors: { metadata: ['Required'] } },
});

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
    },
  });
