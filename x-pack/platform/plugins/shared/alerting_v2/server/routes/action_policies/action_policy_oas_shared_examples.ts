/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionPolicyResponse,
  BulkByIdsParams,
  BulkResponse,
  CreateActionPolicyDataInput,
  ErrorResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getActionPolicyNotFoundMessage,
  getActionPolicyVersionConflictMessage,
  getInvalidActionPolicyDataMessage,
  type ActionPolicyValidationContext,
} from '../../lib/errors/action_policy_error_messages';
import {
  ACTION_POLICY_NOT_FOUND_DESCRIPTION,
  ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION,
  ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
} from './action_policy_route_descriptions';
import {
  INVALID_QUERY_PARAMETERS_DESCRIPTION,
  INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION,
} from '../route_descriptions';
import { invalidResponseExample } from '../oas_utils';
import type { OasExampleEntry } from '../oas_types';

/** Identifier reused across action-policy request/response/error examples. */
export const SAMPLE_ACTION_POLICY_ID = 'action-policy-1';

/** Request body shared by the create and upsert examples. */
export const CREATE_ACTION_POLICY_REQUEST: CreateActionPolicyDataInput = {
  name: 'Notify on host alerts',
  description: 'Sends a workflow notification when matching host alerts fire.',
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: 'host.name: "web-*"',
  tags: ['production'],
  groupingMode: 'per_episode',
  throttle: { strategy: 'on_status_change' },
};

/** Canonical action-policy response reused (with overrides) across examples. */
export const ACTION_POLICY_RESPONSE: ActionPolicyResponse = {
  id: SAMPLE_ACTION_POLICY_ID,
  version: 'WzAsMV0=',
  name: CREATE_ACTION_POLICY_REQUEST.name,
  description: CREATE_ACTION_POLICY_REQUEST.description,
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: 'host.name: "web-*"',
  groupBy: null,
  tags: ['production'],
  groupingMode: 'per_episode',
  throttle: { strategy: 'on_status_change', interval: null },
  snoozedUntil: null,
  auth: { owner: 'elastic', createdByUser: true },
  createdBy: 'elastic',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

/**
 * Builds a 200/201 action-policy response example from a partial override of
 * {@link ACTION_POLICY_RESPONSE}.
 */
export const actionPolicyResponseExample = (
  name: string,
  summary: string,
  overrides: Partial<ActionPolicyResponse> = {}
): OasExampleEntry => ({
  name,
  summary,
  value: { ...ACTION_POLICY_RESPONSE, ...overrides },
});

/**
 * Static 400 body for routes that validate an action-policy payload
 * (create / update / upsert). Uses the domain `INVALID_ACTION_POLICY_DATA`
 * code with a representative per-field validation failure.
 */
export const invalidActionPolicyDataResponse = (
  context: ActionPolicyValidationContext
): OasExampleEntry =>
  invalidResponseExample({
    summary: INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION,
    code: ALERTING_V2_ERROR_CODES.INVALID_ACTION_POLICY_DATA,
    message: getInvalidActionPolicyDataMessage(
      context,
      'name: Invalid input: expected string, received undefined'
    ),
    details: {
      context,
      errors: {
        errors: [],
        properties: {
          name: { errors: ['Invalid input: expected string, received undefined'] },
        },
      },
    },
  });

/** Static 400 body shared by read routes that reject invalid query parameters. */
export const INVALID_QUERY_PARAMETERS_RESPONSE: OasExampleEntry = invalidResponseExample({
  summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
  message: 'page: Too small: expected number to be >=1',
  details: {
    errors: {
      errors: [],
      properties: {
        page: { errors: ['Too small: expected number to be >=1'] },
      },
    },
  },
});

const ACTION_POLICY_VERSION_CONFLICT_VALUE: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT,
  error: 'Conflict',
  message: getActionPolicyVersionConflictMessage(SAMPLE_ACTION_POLICY_ID),
  details: { action_policy_id: SAMPLE_ACTION_POLICY_ID },
};

/** Static 404 body for routes addressing an action policy by id. */
export const ACTION_POLICY_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'actionPolicyNotFound',
  summary: ACTION_POLICY_NOT_FOUND_DESCRIPTION,
  value: {
    code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
    error: 'Not Found',
    message: getActionPolicyNotFoundMessage(SAMPLE_ACTION_POLICY_ID),
    details: { action_policy_id: SAMPLE_ACTION_POLICY_ID },
  } satisfies ErrorResponse,
};

/** Static 409 body for routes that update an existing action policy. */
export const ACTION_POLICY_VERSION_CONFLICT_RESPONSE: OasExampleEntry = {
  name: 'actionPolicyVersionConflict',
  summary: ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
  value: ACTION_POLICY_VERSION_CONFLICT_VALUE,
};

/** Static 409 body for the upsert route (create-or-replace by id). */
export const ACTION_POLICY_UPSERT_CONFLICT_RESPONSE: OasExampleEntry = {
  name: 'actionPolicyVersionConflict',
  summary: ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION,
  value: ACTION_POLICY_VERSION_CONFLICT_VALUE,
};

/** Request body shared across by-ID bulk action-policy operations. */
export const BULK_BY_IDS_REQUEST: BulkByIdsParams = {
  ids: [SAMPLE_ACTION_POLICY_ID, 'action-policy-2'],
};

/** Response shared across by-ID bulk action-policy operations. */
export const BULK_RESPONSE: BulkResponse = {
  affected_count: 2,
  errors: [],
};

/** Static 400 body for bulk-by-ids routes that reject an invalid request body. */
export const INVALID_BULK_BY_IDS_RESPONSE: OasExampleEntry = invalidResponseExample({
  summary: INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION,
  message: 'ids: Invalid input: expected array, received undefined',
  details: {
    errors: {
      errors: [],
      properties: {
        ids: { errors: ['Invalid input: expected array, received undefined'] },
      },
    },
  },
});
