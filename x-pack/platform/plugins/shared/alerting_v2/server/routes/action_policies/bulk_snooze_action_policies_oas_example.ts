/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkSnoozeActionPoliciesBody } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { BULK_RESPONSE, SAMPLE_ACTION_POLICY_ID } from './action_policy_oas_shared_examples';

export const BULK_SNOOZE_ACTION_POLICIES_REQUEST: BulkSnoozeActionPoliciesBody = {
  ids: [SAMPLE_ACTION_POLICY_ID, 'action-policy-2'],
  snoozed_until: '2026-01-16T12:00:00.000Z',
};

export const bulkSnoozeActionPoliciesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkSnoozeActionPoliciesRequest',
      summary: 'Snooze two action policies until a specific timestamp',
      value: BULK_SNOOZE_ACTION_POLICIES_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkSnoozeActionPoliciesResponse',
        summary: 'All targeted policies snoozed',
        value: BULK_RESPONSE,
      },
      400: invalidResponseExample({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        message: 'snoozed_until: Invalid input: expected string, received undefined',
        details: {
          errors: {
            errors: [],
            properties: {
              snoozed_until: { errors: ['Invalid input: expected string, received undefined'] },
            },
          },
        },
      }),
    },
  });
