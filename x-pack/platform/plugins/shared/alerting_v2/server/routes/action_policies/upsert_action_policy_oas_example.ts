/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
  CREATE_ACTION_POLICY_REQUEST,
  actionPolicyResponseExample,
  invalidActionPolicyDataResponse,
} from './action_policy_oas_shared_examples';

export const upsertActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'upsertActionPolicyRequest',
      summary: 'Action policy to create or replace at the given id',
      value: CREATE_ACTION_POLICY_REQUEST,
    },
    responses: {
      200: actionPolicyResponseExample(
        'upsertActionPolicyReplacedResponse',
        'Replaced an existing action policy'
      ),
      201: actionPolicyResponseExample(
        'upsertActionPolicyCreatedResponse',
        'Created a new action policy'
      ),
      400: invalidActionPolicyDataResponse('upsert'),
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
      409: ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
    },
  });
