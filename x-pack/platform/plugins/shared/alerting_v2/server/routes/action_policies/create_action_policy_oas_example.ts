/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActionPolicyOas, type AlertingOasOperationObject } from '../oas_utils';
import {
  CREATE_ACTION_POLICY_REQUEST,
  actionPolicyResponseExample,
  invalidActionPolicyDataResponse,
} from './action_policy_oas_shared_examples';

export const createActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'createActionPolicyRequest',
      summary: 'Workflow notification for matching host alerts',
      value: CREATE_ACTION_POLICY_REQUEST,
    },
    responses: {
      201: actionPolicyResponseExample('createActionPolicyResponse', 'Newly created action policy'),
      400: invalidActionPolicyDataResponse('create'),
    },
  });
