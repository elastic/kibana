/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  RULE_ALREADY_RUNNING_RESPONSE,
  RULE_DISABLED_RESPONSE,
  RULE_NOT_FOUND_RESPONSE,
} from './rule_oas_shared_examples';

export const runRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      400: RULE_DISABLED_RESPONSE,
      404: RULE_NOT_FOUND_RESPONSE,
      409: RULE_ALREADY_RUNNING_RESPONSE,
    },
  });
