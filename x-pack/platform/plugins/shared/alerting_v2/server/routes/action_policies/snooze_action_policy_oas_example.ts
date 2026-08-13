/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeActionPolicyBody } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
  actionPolicyResponseExample,
} from './action_policy_oas_shared_examples';

export const SNOOZE_ACTION_POLICY_REQUEST: SnoozeActionPolicyBody = {
  snoozedUntil: '2026-01-16T12:00:00.000Z',
};

export const snoozeActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'snoozeActionPolicyRequest',
      summary: 'Snooze until a specific timestamp',
      value: SNOOZE_ACTION_POLICY_REQUEST,
    },
    responses: {
      200: actionPolicyResponseExample('snoozeActionPolicyResponse', 'Snoozed action policy', {
        snoozedUntil: SNOOZE_ACTION_POLICY_REQUEST.snoozedUntil,
      }),
      400: invalidResponseExample({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        message: 'snoozedUntil: Invalid input: expected string, received undefined',
        details: {
          errors: {
            errors: [],
            properties: {
              snoozedUntil: { errors: ['Invalid input: expected string, received undefined'] },
            },
          },
        },
      }),
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
      409: ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
    },
  });
