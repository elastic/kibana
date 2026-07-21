/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

type RouteErrorStatus = 400 | 404 | 409;

const jsonExample = (name: string, summary: string, value: unknown) => ({
  content: {
    'application/json': {
      examples: {
        [name]: {
          summary,
          value,
        },
      },
    },
  },
});

const CREATE_REQUEST = {
  name: 'Notify on host alerts',
  description: 'Sends a workflow notification when matching host alerts fire.',
  destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
  matcher: 'host.name: "web-*"',
  tags: ['production'],
  groupingMode: 'per_episode' as const,
  throttle: { strategy: 'on_status_change' as const },
};

const ACTION_POLICY_RESPONSE = {
  id: 'action-policy-1',
  version: 'WzAsMV0=',
  name: CREATE_REQUEST.name,
  description: CREATE_REQUEST.description,
  enabled: true,
  destinations: CREATE_REQUEST.destinations,
  matcher: CREATE_REQUEST.matcher,
  groupBy: null,
  tags: CREATE_REQUEST.tags,
  groupingMode: CREATE_REQUEST.groupingMode,
  throttle: { strategy: 'on_status_change', interval: null },
  snoozedUntil: null,
  auth: { owner: 'elastic', createdByUser: true },
  createdBy: 'elastic',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

const UPDATE_REQUEST = {
  version: 'WzAsMV0=',
  name: 'Notify on host alerts (updated)',
  description: 'Updated description.',
};

const SNOOZE_REQUEST = {
  snoozedUntil: '2026-01-16T12:00:00.000Z',
};

const BULK_REQUEST = {
  actions: [
    { id: 'action-policy-1', action: 'enable' as const },
    { id: 'action-policy-2', action: 'snooze' as const, snoozedUntil: SNOOZE_REQUEST.snoozedUntil },
  ],
};

const MATCH_REQUEST = {
  rule: {
    id: 'rule-1',
    name: 'Host CPU high',
    tags: ['production'],
  },
};

const ERROR_EXAMPLES: Record<RouteErrorStatus, ReturnType<typeof jsonExample>> = {
  400: jsonExample('invalidActionPolicyData', 'Invalid action policy request', {
    code: ALERTING_V2_ERROR_CODES.INVALID_ACTION_POLICY_DATA,
    error: 'Bad Request',
    message: 'Invalid action policy data.',
  } satisfies ErrorResponse),
  404: jsonExample('actionPolicyNotFound', 'Action policy does not exist', {
    code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
    error: 'Not Found',
    message: 'Action policy "action-policy-1" not found.',
    details: { action_policy_id: 'action-policy-1' },
  } satisfies ErrorResponse),
  409: jsonExample('actionPolicyVersionConflict', 'Concurrent update conflict', {
    code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT,
    error: 'Conflict',
    message: 'Action policy "action-policy-1" was updated by another caller.',
    details: { action_policy_id: 'action-policy-1' },
  } satisfies ErrorResponse),
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
  overrides: Record<string, unknown> = {}
) => ({
  name,
  summary,
  value: { ...ACTION_POLICY_RESPONSE, ...overrides },
});

export const createActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'createActionPolicyRequest',
      summary: 'Create an action policy',
      value: CREATE_REQUEST,
    },
    responses: {
      201: policyResponse('createActionPolicyResponse', 'Created action policy'),
    },
    errors: [400],
  });

export const upsertActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'upsertActionPolicyRequest',
      summary: 'Create or replace an action policy',
      value: CREATE_REQUEST,
    },
    responses: {
      200: policyResponse('upsertActionPolicyReplacedResponse', 'Replaced action policy'),
      201: policyResponse('upsertActionPolicyCreatedResponse', 'Created action policy'),
    },
    errors: [400, 404, 409],
  });

export const updateActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'updateActionPolicyRequest',
      summary: 'Partially update an action policy',
      value: UPDATE_REQUEST,
    },
    responses: {
      200: policyResponse('updateActionPolicyResponse', 'Updated action policy', {
        name: UPDATE_REQUEST.name,
        description: UPDATE_REQUEST.description,
      }),
    },
    errors: [400, 404, 409],
  });

export const getActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('getActionPolicyResponse', 'Requested action policy'),
    },
    errors: [404],
  });

export const listActionPoliciesOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'listActionPoliciesResponse',
        summary: 'Paginated action policies',
        value: {
          items: [ACTION_POLICY_RESPONSE],
          total: 1,
          page: 1,
          perPage: 20,
        },
      },
    },
    errors: [400],
  });

export const deleteActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    errors: [404],
  });

export const enableActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('enableActionPolicyResponse', 'Enabled action policy', {
        enabled: true,
      }),
    },
    errors: [404, 409],
  });

export const disableActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('disableActionPolicyResponse', 'Disabled action policy', {
        enabled: false,
      }),
    },
    errors: [404, 409],
  });

export const snoozeActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'snoozeActionPolicyRequest',
      summary: 'Snooze until a timestamp',
      value: SNOOZE_REQUEST,
    },
    responses: {
      200: policyResponse('snoozeActionPolicyResponse', 'Snoozed action policy', {
        snoozedUntil: SNOOZE_REQUEST.snoozedUntil,
      }),
    },
    errors: [400, 404, 409],
  });

export const unsnoozeActionPolicyOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: policyResponse('unsnoozeActionPolicyResponse', 'Unsnoozed action policy', {
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
      summary: 'Enable and snooze policies',
      value: BULK_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkActionActionPoliciesResponse',
        summary: 'Bulk action result',
        value: {
          processed: 2,
          total: 2,
          errors: [],
        },
      },
    },
    errors: [400],
  });

export const matchActionPoliciesForRuleOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    requestBody: {
      name: 'matchActionPoliciesForRuleRequest',
      summary: 'Match policies for a rule',
      value: MATCH_REQUEST,
    },
    responses: {
      200: {
        name: 'matchActionPoliciesForRuleResponse',
        summary: 'Matched action policies',
        value: {
          items: [{ actionPolicy: ACTION_POLICY_RESPONSE, category: 'global-filtered' }],
          total: 1,
        },
      },
    },
    errors: [400],
  });

export const listActionPolicyExecutionHistoryOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'listActionPolicyExecutionHistoryResponse',
        summary: 'Paginated execution history',
        value: {
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
        },
      },
    },
    errors: [400],
  });

export const countActionPolicyExecutionHistoryOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'countActionPolicyExecutionHistoryResponse',
        summary: 'Count of new execution events',
        value: { count: 3 },
      },
    },
    errors: [400],
  });

export const matcherDataFieldsOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'matcherDataFieldsResponse',
        summary: 'Suggested matcher field names',
        value: ['host.name', 'host.ip', 'kibana.alert.rule.name'],
      },
    },
    errors: [400],
  });

export const actionPolicyTagsOasExamples = (): OASOperationObject =>
  buildActionPolicyOas({
    errors: [400],
  });
