/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_utils';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  actionPolicyResponseExample,
} from './action_policy_oas_shared_examples';
import { buildActionPolicyOas } from './oas_utils';

export const getActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: actionPolicyResponseExample('getActionPolicyResponse', 'An action policy'),
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
    },
  });
