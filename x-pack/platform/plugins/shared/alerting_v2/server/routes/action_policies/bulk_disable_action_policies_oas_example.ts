/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOasOperation } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  BULK_BY_IDS_REQUEST,
  BULK_RESPONSE,
  INVALID_BULK_BY_IDS_RESPONSE,
} from './action_policy_oas_shared_examples';

export const bulkDisableActionPoliciesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkDisableActionPoliciesRequest',
      summary: 'Disable two action policies by ID',
      value: BULK_BY_IDS_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkDisableActionPoliciesResponse',
        summary: 'All targeted policies disabled',
        value: BULK_RESPONSE,
      },
      400: INVALID_BULK_BY_IDS_RESPONSE,
    },
  });
