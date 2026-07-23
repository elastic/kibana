/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
  actionPolicyResponseExample,
  invalidActionPolicyDataResponse,
} from './action_policy_oas_shared_examples';
import { buildOasOperation } from '../oas_utils';

export const UPDATE_ACTION_POLICY_REQUEST: UpdateActionPolicyBody = {
  version: 'WzAsMV0=',
  name: 'Notify on host alerts (updated)',
  description: 'Updated description.',
};

export const updateActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'updateActionPolicyRequest',
      summary: 'Rename and update the description',
      value: UPDATE_ACTION_POLICY_REQUEST,
    },
    responses: {
      200: actionPolicyResponseExample('updateActionPolicyResponse', 'Updated action policy', {
        name: UPDATE_ACTION_POLICY_REQUEST.name,
        description: UPDATE_ACTION_POLICY_REQUEST.description,
      }),
      400: invalidActionPolicyDataResponse('update'),
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
      409: ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
    },
  });
