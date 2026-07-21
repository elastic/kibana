/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type {
  ActionPolicyResponse,
  BulkActionActionPoliciesBody,
  BulkActionActionPoliciesResponse,
  CountPolicyExecutionEventsResponse,
  CreateActionPolicyDataInput,
  ErrorResponse,
  FindActionPoliciesResponse,
  ListPolicyExecutionHistoryResponse,
  MatchActionPoliciesForRuleBody,
  MatchActionPoliciesForRuleResponse,
  ActionPolicyTagsResponse,
  MatcherDataFieldsResponse,
  SnoozeActionPolicyBody,
  UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getActionPolicyNotFoundMessage,
  getActionPolicyVersionConflictMessage,
  getInvalidActionPolicyDataMessage,
} from '../../lib/errors/action_policy_error_messages';
import { jsonExample } from '../json_oas_example';
import {
  ACTION_POLICY_NOT_FOUND_DESCRIPTION,
  ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION,
  ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
  INVALID_QUERY_PARAMETERS_DESCRIPTION,
  INVALID_REQUEST_BODY_DESCRIPTION,
  INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION,
} from '../route_response_descriptions';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

type RouteErrorStatus = 400 | 404 | 409;

/** Shared with each action-policy route's `routeOptions.summary`. */
export const CREATE_ACTION_POLICY_SUMMARY = 'Create an action policy';
export const UPSERT_ACTION_POLICY_SUMMARY = 'Create or replace an action policy';
export const UPDATE_ACTION_POLICY_SUMMARY = 'Partially update an action policy.';
export const GET_ACTION_POLICY_SUMMARY = 'Get an action policy';
export const LIST_ACTION_POLICIES_SUMMARY = 'List action policies';
export const DELETE_ACTION_POLICY_SUMMARY = 'Delete an action policy';
export const ENABLE_ACTION_POLICY_SUMMARY = 'Enable an action policy';
export const DISABLE_ACTION_POLICY_SUMMARY = 'Disable an action policy';
export const SNOOZE_ACTION_POLICY_SUMMARY = 'Snooze an action policy';
export const UNSNOOZE_ACTION_POLICY_SUMMARY = 'Unsnooze an action policy';
export const UPDATE_ACTION_POLICY_API_KEY_SUMMARY = 'Update an action policy API key';
export const BULK_ACTION_ACTION_POLICIES_SUMMARY = 'Bulk action action policies';
export const MATCH_ACTION_POLICIES_FOR_RULE_SUMMARY = 'Match action policies for a rule';
export const LIST_ACTION_POLICY_EXECUTION_HISTORY_SUMMARY = 'List action policy execution history';
export const COUNT_ACTION_POLICY_EXECUTION_HISTORY_SUMMARY =
  'Count new action policy execution events since a timestamp';
export const MATCHER_DATA_FIELDS_SUMMARY = 'Get matcher data fields suggestions';
export const ACTION_POLICY_TAGS_SUMMARY = 'Get action policy tags suggestions';

const CREATE_REQUEST: CreateActionPolicyDataInput = {
  name: 'Notify on host alerts',
  description: 'Sends a workflow notification when matching host alerts fire.',
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: 'host.name: "web-*"',
  tags: ['production'],
  groupingMode: 'per_episode',
  throttle: { strategy: 'on_status_change' },
};

const ACTION_POLICY_RESPONSE: ActionPolicyResponse = {
  id: 'action-policy-1',
  version: 'WzAsMV0=',
  name: CREATE_REQUEST.name,
  description: CREATE_REQUEST.description,
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

const UPDATE_REQUEST: UpdateActionPolicyBody = {
  version: 'WzAsMV0=',
  name: 'Notify on host alerts (updated)',
  description: 'Updated description.',
};

const SNOOZE_REQUEST: SnoozeActionPolicyBody = {
  snoozedUntil: '2026-01-16T12:00:00.000Z',
};

const BULK_REQUEST: BulkActionActionPoliciesBody = {
  actions: [
    { id: 'action-policy-1', action: 'enable' },
    { id: 'action-policy-2', action: 'snooze', snoozedUntil: SNOOZE_REQUEST.snoozedUntil },
  ],
};

const MATCH_REQUEST: MatchActionPoliciesForRuleBody = {
  rule: {
    id: 'rule-1',
    name: 'Host CPU high',
    tags: ['production'],
  },
};

const LIST_RESPONSE: FindActionPoliciesResponse = {
  items: [ACTION_POLICY_RESPONSE],
  total: 1,
  page: 1,
  perPage: 20,
};

const BULK_RESPONSE: BulkActionActionPoliciesResponse = {
  processed: 2,
  total: 2,
  errors: [],
};

const MATCH_RESPONSE: MatchActionPoliciesForRuleResponse = {
  items: [{ actionPolicy: ACTION_POLICY_RESPONSE, category: 'global-filtered' }],
  total: 1,
};

const EXECUTION_HISTORY_RESPONSE: ListPolicyExecutionHistoryResponse = {
  items: [
    {
      '@timestamp': '2026-01-15T12:05:00.000Z',
      policy: { id: 'action-policy-1', name: 'Notify on host alerts' },
      outcome: 'dispatched',
      episode_count: 1,
      action_group_count: 1,
      rules: [{ id: 'rule-1', name: 'Host CPU high' }],
      totalRuleCount: 1,
      workflows: [{ id: 'workflow-1', name: 'Notify oncall' }],
    },
  ],
  page: 1,
  perPage: 20,
  totalEvents: 1,
  searchMatches: null,
};

const EXECUTION_HISTORY_COUNT_RESPONSE: CountPolicyExecutionEventsResponse = {
  count: 3,
};

const MATCHER_DATA_FIELDS_RESPONSE: MatcherDataFieldsResponse = [
  'host.name',
  'host.ip',
  'kibana.alert.rule.name',
];

const ACTION_POLICY_TAGS_RESPONSE: ActionPolicyTagsResponse = ['production', 'critical', 'hosts'];

const SAMPLE_ACTION_POLICY_ID = ACTION_POLICY_RESPONSE.id;

const INVALID_ACTION_POLICY_DATA_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.INVALID_ACTION_POLICY_DATA,
  error: 'Bad Request',
  message: getInvalidActionPolicyDataMessage('create', 'name: Required'),
  details: { context: 'create', errors: { name: ['Required'] } },
};

const ACTION_POLICY_NOT_FOUND_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
  error: 'Not Found',
  message: getActionPolicyNotFoundMessage(SAMPLE_ACTION_POLICY_ID),
  details: { action_policy_id: SAMPLE_ACTION_POLICY_ID },
};

const ACTION_POLICY_VERSION_CONFLICT_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT,
  error: 'Conflict',
  message: getActionPolicyVersionConflictMessage(SAMPLE_ACTION_POLICY_ID),
  details: { action_policy_id: SAMPLE_ACTION_POLICY_ID },
};

const INVALID_QUERY_PARAMETERS_ERROR: ErrorResponse = {
  code: 'BAD_REQUEST',
  error: 'Bad Request',
  message: 'page: Expected number, received nan',
  details: { errors: { page: ['Expected number, received nan'] } },
};

const ERROR_EXAMPLES: Record<RouteErrorStatus, ReturnType<typeof jsonExample<ErrorResponse>>> = {
  400: jsonExample(
    'invalidActionPolicyData',
    INVALID_REQUEST_PARAMETERS_OR_BODY_DESCRIPTION,
    INVALID_ACTION_POLICY_DATA_ERROR
  ),
  404: jsonExample(
    'actionPolicyNotFound',
    ACTION_POLICY_NOT_FOUND_DESCRIPTION,
    ACTION_POLICY_NOT_FOUND_ERROR
  ),
  409: jsonExample(
    'actionPolicyVersionConflict',
    ACTION_POLICY_VERSION_CONFLICT_DESCRIPTION,
    ACTION_POLICY_VERSION_CONFLICT_ERROR
  ),
};

const INVALID_QUERY_PARAMETERS_EXAMPLE = {
  name: 'invalidQueryParameters',
  summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
  value: INVALID_QUERY_PARAMETERS_ERROR,
};

const INVALID_REQUEST_BODY_EXAMPLE = {
  name: 'invalidActionPolicyData',
  summary: INVALID_REQUEST_BODY_DESCRIPTION,
  value: INVALID_ACTION_POLICY_DATA_ERROR,
};

const ACTION_POLICY_UPSERT_CONFLICT_EXAMPLE = {
  name: 'actionPolicyVersionConflict',
  summary: ACTION_POLICY_UPSERT_CONFLICT_DESCRIPTION,
  value: ACTION_POLICY_VERSION_CONFLICT_ERROR,
};

const buildActionPolicyOas = ({
  requestBody,
  responses = {},
  errors = [],
}: {
  requestBody?: { name: string; summary: string; value: unknown };
  responses?: Record<number, { name: string; summary: string; value: unknown }>;
  errors?: RouteErrorStatus[];
}): OASOperationObject => {
  const operation: OASOperationObject = {};

  if (requestBody) {
    operation.requestBody = jsonExample(requestBody.name, requestBody.summary, requestBody.value);
  }

  const responseEntries: Record<string, ReturnType<typeof jsonExample>> = {};
  for (const [status, example] of Object.entries(responses)) {
    responseEntries[status] = jsonExample(example.name, example.summary, example.value);
  }
  for (const status of errors) {
    responseEntries[String(status)] = ERROR_EXAMPLES[status];
  }
  if (Object.keys(responseEntries).length > 0) {
    operation.responses = responseEntries;
  }

  return operation;
};

const policyResponse = (
  name: string,
  summary: string,
  overrides: Partial<ActionPolicyResponse> = {}
): { name: string; summary: string; value: ActionPolicyResponse } => ({
  name,
  summary,
  value: { ...ACTION_POLICY_RESPONSE, ...overrides },
});

export const createActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'createActionPolicyRequest',
      summary: CREATE_ACTION_POLICY_SUMMARY,
      value: CREATE_REQUEST,
    },
    responses: {
      201: policyResponse('createActionPolicyResponse', CREATE_ACTION_POLICY_SUMMARY),
    },
    errors: [400],
  });

export const upsertActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'upsertActionPolicyRequest',
      summary: UPSERT_ACTION_POLICY_SUMMARY,
      value: CREATE_REQUEST,
    },
    responses: {
      200: policyResponse('upsertActionPolicyReplacedResponse', UPSERT_ACTION_POLICY_SUMMARY),
      201: policyResponse('upsertActionPolicyCreatedResponse', UPSERT_ACTION_POLICY_SUMMARY),
      409: ACTION_POLICY_UPSERT_CONFLICT_EXAMPLE,
    },
    errors: [400, 404],
  });

export const updateActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'updateActionPolicyRequest',
      summary: UPDATE_ACTION_POLICY_SUMMARY,
      value: UPDATE_REQUEST,
    },
    responses: {
      200: policyResponse('updateActionPolicyResponse', UPDATE_ACTION_POLICY_SUMMARY, {
        name: UPDATE_REQUEST.name,
        description: UPDATE_REQUEST.description,
      }),
    },
    errors: [400, 404, 409],
  });

export const getActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('getActionPolicyResponse', GET_ACTION_POLICY_SUMMARY),
    },
    errors: [404],
  });

export const listActionPoliciesOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'listActionPoliciesResponse',
        summary: LIST_ACTION_POLICIES_SUMMARY,
        value: LIST_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_EXAMPLE,
    },
  });

export const deleteActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    errors: [404],
  });

export const enableActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('enableActionPolicyResponse', ENABLE_ACTION_POLICY_SUMMARY, {
        enabled: true,
      }),
    },
    errors: [404, 409],
  });

export const disableActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('disableActionPolicyResponse', DISABLE_ACTION_POLICY_SUMMARY, {
        enabled: false,
      }),
    },
    errors: [404, 409],
  });

export const snoozeActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'snoozeActionPolicyRequest',
      summary: SNOOZE_ACTION_POLICY_SUMMARY,
      value: SNOOZE_REQUEST,
    },
    responses: {
      200: policyResponse('snoozeActionPolicyResponse', SNOOZE_ACTION_POLICY_SUMMARY, {
        snoozedUntil: SNOOZE_REQUEST.snoozedUntil,
      }),
    },
    errors: [400, 404, 409],
  });

export const unsnoozeActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('unsnoozeActionPolicyResponse', UNSNOOZE_ACTION_POLICY_SUMMARY, {
        snoozedUntil: null,
      }),
    },
    errors: [404, 409],
  });

export const updateActionPolicyApiKeyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    errors: [404, 409],
  });

export const bulkActionActionPoliciesOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'bulkActionActionPoliciesRequest',
      summary: BULK_ACTION_ACTION_POLICIES_SUMMARY,
      value: BULK_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkActionActionPoliciesResponse',
        summary: BULK_ACTION_ACTION_POLICIES_SUMMARY,
        value: BULK_RESPONSE,
      },
      400: INVALID_REQUEST_BODY_EXAMPLE,
    },
  });

export const matchActionPoliciesForRuleOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'matchActionPoliciesForRuleRequest',
      summary: MATCH_ACTION_POLICIES_FOR_RULE_SUMMARY,
      value: MATCH_REQUEST,
    },
    responses: {
      200: {
        name: 'matchActionPoliciesForRuleResponse',
        summary: MATCH_ACTION_POLICIES_FOR_RULE_SUMMARY,
        value: MATCH_RESPONSE,
      },
      400: INVALID_REQUEST_BODY_EXAMPLE,
    },
  });

export const listActionPolicyExecutionHistoryOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'listActionPolicyExecutionHistoryResponse',
        summary: LIST_ACTION_POLICY_EXECUTION_HISTORY_SUMMARY,
        value: EXECUTION_HISTORY_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_EXAMPLE,
    },
  });

export const countActionPolicyExecutionHistoryOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'countActionPolicyExecutionHistoryResponse',
        summary: COUNT_ACTION_POLICY_EXECUTION_HISTORY_SUMMARY,
        value: EXECUTION_HISTORY_COUNT_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_EXAMPLE,
    },
  });

export const matcherDataFieldsOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'matcherDataFieldsResponse',
        summary: MATCHER_DATA_FIELDS_SUMMARY,
        value: MATCHER_DATA_FIELDS_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_EXAMPLE,
    },
  });

export const actionPolicyTagsOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'actionPolicyTagsResponse',
        summary: ACTION_POLICY_TAGS_SUMMARY,
        value: ACTION_POLICY_TAGS_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_EXAMPLE,
    },
  });
