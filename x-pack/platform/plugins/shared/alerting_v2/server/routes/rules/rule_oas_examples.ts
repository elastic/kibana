/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type {
  BulkGetRulesParams,
  BulkGetRulesResponse,
  BulkOperationParams,
  BulkOperationResponse,
  CreateRuleDataInput,
  ErrorResponse,
  FindRulesResponse,
  RuleResponse,
  RuleTagsResponse,
  UpdateRuleBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getInvalidRuleDataMessage,
  getRuleNotFoundMessage,
  getRuleVersionConflictMessage,
} from '../../lib/errors/rule_error_messages';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

type RouteErrorStatus = 400 | 404 | 409;

const jsonExample = <T>(name: string, summary: string, value: T) => ({
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

const CREATE_REQUEST: CreateRuleDataInput = {
  kind: 'alert',
  metadata: {
    name: 'Host CPU high',
    description: 'Alerts when average CPU usage exceeds a threshold.',
    tags: ['production', 'infra'],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  recovery_strategy: 'no_breach',
  query: {
    format: 'standalone',
    breach: {
      query:
        'FROM metrics-* | WHERE host.cpu.usage > 0.9 | STATS avg_cpu = AVG(host.cpu.usage) BY host.name',
    },
  },
  grouping: { fields: ['host.name'] },
  state_transition: { pending_count: 1, recovering_count: 1 },
};

const RULE_RESPONSE: RuleResponse = {
  id: 'rule-1',
  version: 'WzAsMV0=',
  kind: 'alert',
  metadata: {
    name: CREATE_REQUEST.metadata.name,
    description: CREATE_REQUEST.metadata.description,
    tags: CREATE_REQUEST.metadata.tags,
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  recovery_strategy: 'no_breach',
  query: CREATE_REQUEST.query,
  grouping: { fields: ['host.name'] },
  state_transition: { pending_count: 1, recovering_count: 1 },
  enabled: true,
  createdBy: 'elastic',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

const UPDATE_REQUEST: UpdateRuleBody = {
  version: 'WzAsMV0=',
  metadata: {
    name: 'Host CPU high (updated)',
    description: 'Updated description.',
  },
};

const BULK_GET_REQUEST: BulkGetRulesParams = {
  ids: ['rule-1', 'rule-2'],
};

const BULK_OPERATION_REQUEST: BulkOperationParams = {
  ids: ['rule-1', 'rule-2'],
};

const LIST_RESPONSE: FindRulesResponse = {
  items: [RULE_RESPONSE],
  total: 1,
  page: 1,
  perPage: 20,
};

const BULK_GET_RESPONSE: BulkGetRulesResponse = {
  rules: [RULE_RESPONSE],
};

const BULK_OPERATION_RESPONSE: BulkOperationResponse = {
  rules: [RULE_RESPONSE],
  errors: [],
};

const RULE_TAGS_RESPONSE: RuleTagsResponse = {
  tags: ['production', 'infra', 'critical'],
};

const SAMPLE_RULE_ID = RULE_RESPONSE.id;

const INVALID_RULE_DATA_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
  error: 'Bad Request',
  message: getInvalidRuleDataMessage('create', 'metadata.name: Required'),
  details: { context: 'create', errors: { metadata: { name: ['Required'] } } },
};

const RULE_NOT_FOUND_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
  error: 'Not Found',
  message: getRuleNotFoundMessage(SAMPLE_RULE_ID),
  details: { rule_id: SAMPLE_RULE_ID },
};

const RULE_VERSION_CONFLICT_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.RULE_VERSION_CONFLICT,
  error: 'Conflict',
  message: getRuleVersionConflictMessage(SAMPLE_RULE_ID),
  details: { rule_id: SAMPLE_RULE_ID },
};

const ERROR_EXAMPLES: Record<RouteErrorStatus, ReturnType<typeof jsonExample<ErrorResponse>>> = {
  400: jsonExample('invalidRuleData', 'Invalid rule request', INVALID_RULE_DATA_ERROR),
  404: jsonExample('ruleNotFound', 'Rule does not exist', RULE_NOT_FOUND_ERROR),
  409: jsonExample(
    'ruleVersionConflict',
    'Concurrent update conflict',
    RULE_VERSION_CONFLICT_ERROR
  ),
};

const buildRuleOas = ({
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

const ruleResponse = (
  name: string,
  summary: string,
  overrides: Partial<RuleResponse> = {}
): { name: string; summary: string; value: RuleResponse } => ({
  name,
  summary,
  value: { ...RULE_RESPONSE, ...overrides },
});

export const createRuleOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'createRuleRequest',
      summary: 'Create a rule',
      value: CREATE_REQUEST,
    },
    responses: {
      201: ruleResponse('createRuleResponse', 'Created rule'),
    },
    errors: [400],
  });

export const upsertRuleOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'upsertRuleRequest',
      summary: 'Create or replace a rule',
      value: CREATE_REQUEST,
    },
    responses: {
      200: ruleResponse('upsertRuleReplacedResponse', 'Replaced rule'),
      201: ruleResponse('upsertRuleCreatedResponse', 'Created rule'),
    },
    errors: [400, 404, 409],
  });

export const updateRuleOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'updateRuleRequest',
      summary: 'Partially update a rule',
      value: UPDATE_REQUEST,
    },
    responses: {
      200: ruleResponse('updateRuleResponse', 'Updated rule', {
        metadata: {
          ...RULE_RESPONSE.metadata,
          name: UPDATE_REQUEST.metadata!.name!,
          description: UPDATE_REQUEST.metadata!.description,
        },
      }),
    },
    errors: [400, 404, 409],
  });

export const getRuleOasExamples = (): OASOperationObject =>
  buildRuleOas({
    responses: {
      200: ruleResponse('getRuleResponse', 'Requested rule'),
    },
    errors: [404],
  });

export const listRulesOasExamples = (): OASOperationObject =>
  buildRuleOas({
    responses: {
      200: {
        name: 'listRulesResponse',
        summary: 'Paginated rules',
        value: LIST_RESPONSE,
      },
    },
    errors: [400],
  });

export const deleteRuleOasExamples = (): OASOperationObject =>
  buildRuleOas({
    errors: [404],
  });

export const bulkGetRulesOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkGetRulesRequest',
      summary: 'Retrieve rules by id',
      value: BULK_GET_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkGetRulesResponse',
        summary: 'Requested rules',
        value: BULK_GET_RESPONSE,
      },
    },
    errors: [400, 404],
  });

export const ruleTagsOasExamples = (): OASOperationObject =>
  buildRuleOas({
    responses: {
      200: {
        name: 'ruleTagsResponse',
        summary: 'Unique rule tags',
        value: RULE_TAGS_RESPONSE,
      },
    },
    errors: [400],
  });

export const bulkDeleteRulesOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkDeleteRulesRequest',
      summary: 'Delete rules by id',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkDeleteRulesResponse',
        summary: 'Bulk delete result',
        value: BULK_OPERATION_RESPONSE,
      },
    },
    errors: [400],
  });

export const bulkEnableRulesOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkEnableRulesRequest',
      summary: 'Enable rules by id',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkEnableRulesResponse',
        summary: 'Bulk enable result',
        value: BULK_OPERATION_RESPONSE,
      },
    },
    errors: [400],
  });

export const bulkDisableRulesOasExamples = (): OASOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'bulkDisableRulesRequest',
      summary: 'Disable rules by id',
      value: BULK_OPERATION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkDisableRulesResponse',
        summary: 'Bulk disable result',
        value: {
          ...BULK_OPERATION_RESPONSE,
          rules: [{ ...RULE_RESPONSE, enabled: false }],
        },
      },
    },
    errors: [400],
  });
