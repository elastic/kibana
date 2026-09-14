/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  MAX_SCHEDULES_PER_MINUTE_EXCEEDED_RESPONSE,
  RULE_NOT_FOUND_RESPONSE,
  RULE_VERSION_CONFLICT_RESPONSE,
  ruleResponseExample,
} from './rule_oas_shared_examples';

export const enableRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: ruleResponseExample('enableRuleResponse', 'Enabled host CPU threshold rule', {
        enabled: true,
      }),
      400: MAX_SCHEDULES_PER_MINUTE_EXCEEDED_RESPONSE,
      404: RULE_NOT_FOUND_RESPONSE,
      409: RULE_VERSION_CONFLICT_RESPONSE,
    },
  });
