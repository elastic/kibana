/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindActionPoliciesResponse } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  ACTION_POLICY_RESPONSE,
  INVALID_QUERY_PARAMETERS_RESPONSE,
} from './action_policy_oas_shared_examples';
import { buildOasOperation } from '../oas_utils';

export const LIST_ACTION_POLICIES_RESPONSE: FindActionPoliciesResponse = {
  items: [ACTION_POLICY_RESPONSE],
  total: 1,
  page: 1,
  per_page: 20,
};

export const listActionPoliciesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'listActionPoliciesResponse',
        summary: 'A page of action policies',
        value: LIST_ACTION_POLICIES_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
    },
  });
