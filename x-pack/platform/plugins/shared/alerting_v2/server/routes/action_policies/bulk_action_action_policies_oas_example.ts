/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkActionActionPoliciesBody,
  BulkActionActionPoliciesResponse,
} from '@kbn/alerting-v2-schemas';
import { invalidResponseExample, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_REQUEST_BODY_DESCRIPTION } from '../route_descriptions';
import { buildActionPolicyOas } from './oas_utils';

export const BULK_ACTION_ACTION_POLICIES_REQUEST: BulkActionActionPoliciesBody = {
  actions: [
    { id: 'action-policy-1', action: 'enable' },
    { id: 'action-policy-2', action: 'snooze', snoozedUntil: '2026-01-16T12:00:00.000Z' },
  ],
};

export const BULK_ACTION_ACTION_POLICIES_RESPONSE: BulkActionActionPoliciesResponse = {
  processed: 2,
  total: 2,
  errors: [],
};

export const bulkActionActionPoliciesOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'bulkActionActionPoliciesRequest',
      summary: 'Enable one policy and snooze another',
      value: BULK_ACTION_ACTION_POLICIES_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkActionActionPoliciesResponse',
        summary: 'All requested actions applied',
        value: BULK_ACTION_ACTION_POLICIES_RESPONSE,
      },
      400: invalidResponseExample({
        summary: INVALID_REQUEST_BODY_DESCRIPTION,
        message: 'actions: Invalid input: expected array, received undefined',
        details: {
          errors: {
            errors: [],
            properties: {
              actions: { errors: ['Invalid input: expected array, received undefined'] },
            },
          },
        },
      }),
    },
  });
