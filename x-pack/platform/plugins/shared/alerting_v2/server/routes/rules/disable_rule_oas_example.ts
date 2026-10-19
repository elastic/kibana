/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  INVALID_QUERY_PARAMETERS_RESPONSE,
  RULE_NOT_FOUND_RESPONSE,
  RULE_VERSION_CONFLICT_RESPONSE,
  ruleResponseExample,
} from './rule_oas_shared_examples';

export const disableRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: ruleResponseExample('disableRuleResponse', 'Disabled host CPU threshold rule', {
        enabled: false,
      }),
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
      404: RULE_NOT_FOUND_RESPONSE,
      409: RULE_VERSION_CONFLICT_RESPONSE,
    },
  });
