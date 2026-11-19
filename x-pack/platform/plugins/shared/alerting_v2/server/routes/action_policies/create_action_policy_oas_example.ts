/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { getActionPolicyAlreadyExistsMessage } from '../../lib/errors/action_policy_error_messages';
import type { AlertingOasOperationObject, OasExampleEntry } from '../oas_types';
import {
  ACTION_POLICY_LICENSE_NOT_SUPPORTED_RESPONSE,
  CREATE_ACTION_POLICY_REQUEST,
  SAMPLE_ACTION_POLICY_ID,
  actionPolicyResponseExample,
  invalidActionPolicyDataResponse,
} from './action_policy_oas_shared_examples';
import { buildOasOperation } from '../oas_utils';

const ACTION_POLICY_ALREADY_EXISTS_RESPONSE: OasExampleEntry = {
  name: 'actionPolicyAlreadyExists',
  summary: 'An action policy with the requested ID already exists',
  value: {
    code: ALERTING_ERROR_CODES.ACTION_POLICY_ALREADY_EXISTS,
    error: 'Conflict',
    message: getActionPolicyAlreadyExistsMessage(SAMPLE_ACTION_POLICY_ID),
    details: { action_policy_id: SAMPLE_ACTION_POLICY_ID },
  } satisfies ErrorResponse,
};

export const createActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createActionPolicyRequest',
      summary: 'Notification for alerts from rules with the production tag',
      value: CREATE_ACTION_POLICY_REQUEST,
    },
    responses: {
      201: actionPolicyResponseExample('createActionPolicyResponse', 'Newly created action policy'),
      400: invalidActionPolicyDataResponse('create'),
      403: ACTION_POLICY_LICENSE_NOT_SUPPORTED_RESPONSE,
      409: ACTION_POLICY_ALREADY_EXISTS_RESPONSE,
    },
  });
