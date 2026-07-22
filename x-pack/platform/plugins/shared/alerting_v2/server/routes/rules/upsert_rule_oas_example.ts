/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  CREATE_RULE_REQUEST,
  INVALID_RULE_DATA_EXAMPLE,
  RULE_UPSERT_CONFLICT_EXAMPLE,
  buildRuleOas,
  ruleResponseExample,
} from './rule_oas_shared';

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
      400: INVALID_RULE_DATA_EXAMPLE,
      409: RULE_UPSERT_CONFLICT_EXAMPLE,
    },
    errors: [404],
  });
