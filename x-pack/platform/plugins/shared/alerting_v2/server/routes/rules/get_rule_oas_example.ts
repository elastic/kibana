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
  ruleResponseExample,
} from './rule_oas_shared_examples';

export const getRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: ruleResponseExample('getRuleResponse', 'Retrieved host CPU threshold rule'),
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
      404: RULE_NOT_FOUND_RESPONSE,
    },
  });
