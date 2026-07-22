/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkByIdsParams,
  BulkGetRulesParams,
  BulkGetRulesResponse,
  BulkResponse,
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
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { jsonExample, type AlertingOasOperationObject } from '../json_oas_example';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_response_descriptions';
import {
  RULE_NOT_FOUND_DESCRIPTION,
  RULE_UPSERT_CONFLICT_DESCRIPTION,
  RULE_VERSION_CONFLICT_DESCRIPTION,
  RULES_NOT_FOUND_DESCRIPTION,
} from './rule_response_descriptions';

type RouteErrorStatus = 404 | 409;

export interface OasExampleEntry {
  name: string;
  summary: string;
  value: unknown;
}

export const UPDATED_RULE_NAME = 'Host CPU high (updated)';
export const UPDATED_RULE_DESCRIPTION = 'Updated description.';

export const CREATE_RULE_REQUEST: CreateRuleDataInput = {
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

export const RULE_RESPONSE: RuleResponse = {
  id: 'rule-1',
  version: 'WzAsMV0=',
  kind: 'alert',
  metadata: {
    name: 'Host CPU high',
    description: 'Alerts when average CPU usage exceeds a threshold.',
    tags: ['production', 'infra'],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  recovery_strategy: 'no_breach',
  query: CREATE_RULE_REQUEST.query,
  grouping: { fields: ['host.name'] },
  state_transition: { pending_count: 1, recovering_count: 1 },
  enabled: true,
  createdBy: 'elastic',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

export const UPDATE_RULE_REQUEST: UpdateRuleBody = {
  version: 'WzAsMV0=',
  metadata: {
    name: UPDATED_RULE_NAME,
    description: UPDATED_RULE_DESCRIPTION,
  },
};

export const BULK_GET_RULES_REQUEST: BulkGetRulesParams = {
  ids: ['rule-1', 'rule-2'],
};

export const BULK_OPERATION_REQUEST: BulkByIdsParams = {
  ids: ['rule-1', 'rule-2'],
};

export const LIST_RULES_RESPONSE: FindRulesResponse = {
  items: [RULE_RESPONSE],
  total: 1,
  page: 1,
  perPage: 20,
};

export const BULK_GET_RULES_RESPONSE: BulkGetRulesResponse = {
  rules: [RULE_RESPONSE],
};

export const BULK_OPERATION_RESPONSE: BulkResponse = {
  affected_count: 2,
  errors: [],
};

export const RULE_TAGS_RESPONSE: RuleTagsResponse = {
  tags: ['production', 'infra', 'critical'],
};

const SAMPLE_RULE_ID = RULE_RESPONSE.id;

/**
 * Validation errors currently return Kibana core's Boom shape, but Core will
 * align them with `ErrorResponse` (see https://github.com/elastic/kibana/issues/265514).
 * Document the target `ErrorResponse` shape so these examples stay correct once that lands.
 */
export const INVALID_RULE_DATA_EXAMPLE: OasExampleEntry = {
  name: 'invalidRequest',
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  value: {
    code: ALERTING_V2_ERROR_CODES.INVALID_RULE_DATA,
    error: 'Bad Request',
    message: getInvalidRuleDataMessage('create', 'metadata: Required'),
    details: {
      context: 'create',
      errors: { metadata: ['Required'] },
    },
  } satisfies ErrorResponse,
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
  404: jsonExample('ruleNotFound', RULE_NOT_FOUND_DESCRIPTION, RULE_NOT_FOUND_ERROR),
  409: jsonExample(
    'ruleVersionConflict',
    RULE_VERSION_CONFLICT_DESCRIPTION,
    RULE_VERSION_CONFLICT_ERROR
  ),
};

export const RULE_UPSERT_CONFLICT_EXAMPLE: OasExampleEntry = {
  name: 'ruleVersionConflict',
  summary: RULE_UPSERT_CONFLICT_DESCRIPTION,
  value: RULE_VERSION_CONFLICT_ERROR,
};

// Bulk-get rethrows the raw SO Boom; onError derives `NOT_FOUND` + SO message.
export const RULES_NOT_FOUND_EXAMPLE: OasExampleEntry = {
  name: 'rulesNotFound',
  summary: RULES_NOT_FOUND_DESCRIPTION,
  value: {
    code: 'NOT_FOUND',
    error: 'Not Found',
    message: `Saved object [${RULE_SAVED_OBJECT_TYPE}/${SAMPLE_RULE_ID}] not found`,
  } satisfies ErrorResponse,
};

export const ruleResponseExample = (
  name: string,
  summary: string,
  overrides: Partial<RuleResponse> = {}
): OasExampleEntry => ({
  name,
  summary,
  value: { ...RULE_RESPONSE, ...overrides },
});

/**
 * Builds an OAS operation object from request/response examples.
 * Status codes listed in `errors` override any matching entry already set in `responses`.
 */
export const buildRuleOas = ({
  requestBody,
  responses = {},
  errors = [],
}: {
  requestBody?: OasExampleEntry;
  responses?: Record<number, OasExampleEntry>;
  errors?: RouteErrorStatus[];
}): AlertingOasOperationObject => {
  const operation: AlertingOasOperationObject = {};

  if (requestBody) {
    operation.requestBody = jsonExample(requestBody.name, requestBody.summary, requestBody.value);
  }

  const responseEntries: Record<string, ReturnType<typeof jsonExample>> = {};
  for (const [status, example] of Object.entries(responses)) {
    responseEntries[status] = jsonExample(example.name, example.summary, example.value);
  }
  // Error examples override any response entry for the same status code.
  for (const status of errors) {
    responseEntries[String(status)] = ERROR_EXAMPLES[status];
  }
  if (Object.keys(responseEntries).length > 0) {
    operation.responses = responseEntries;
  }

  return operation;
};
