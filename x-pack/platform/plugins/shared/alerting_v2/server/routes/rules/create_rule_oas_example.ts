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
  buildRuleOas,
  ruleResponseExample,
} from './rule_oas_shared';

export const createRuleOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'createRuleRequest',
      summary: 'Create a host CPU threshold rule',
      value: CREATE_RULE_REQUEST,
    },
    responses: {
      201: ruleResponseExample('createRuleResponse', 'Created host CPU threshold rule'),
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });
