/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  INVALID_QUERY_PARAMETERS_RESPONSE,
} from './action_policy_oas_shared_examples';
import { buildOasOperation } from '../oas_utils';

export const deleteActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
    },
  });
