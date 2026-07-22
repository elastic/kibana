/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkGetRulesParams,
  BulkGetRulesResponse,
  BulkResponse,
  CreateRuleDataInput,
  DryRunResponse,
  ErrorResponse,
  FindRulesResponse,
  RuleResponse,
  RuleTagsResponse,
  UpdateRuleBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { getRuleNotFoundMessage } from '../../lib/errors/rule_error_messages';
import { jsonExample, type AlertingOasOperationObject } from '../json_oas_example';

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

export const BULK_BY_QUERY_REQUEST: BulkByQueryParams = {
  filter: 'tags: production',
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

export const DRY_RUN_RESPONSE: DryRunResponse = {
  match_count: 2,
  sample: ['rule-1', 'rule-2'],
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
export const invalidResponseExample = ({
  summary,
  message,
  details,
  code = 'BAD_REQUEST',
}: {
  summary: string;
  message: string;
  details?: ErrorResponse['details'];
  code?: string;
}): OasExampleEntry => ({
  name: 'invalidRequest',
  summary,
  value: {
    code,
    error: 'Bad Request',
    message,
    ...(details !== undefined ? { details } : {}),
  } satisfies ErrorResponse,
});

/** Shared 400 body for by-ID bulk routes (enable/disable/delete). */
export const INVALID_BULK_OPERATION_RESPONSE = invalidResponseExample({
  summary: 'Request body is missing required rule ids',
  message: 'ids: Required',
  details: { errors: { ids: ['Required'] } },
});

/** Shared 400 body for by-query bulk routes. */
export const INVALID_BULK_BY_QUERY_RESPONSE = invalidResponseExample({
  summary: 'By-query body omits filter, search, and match_all',
  message: 'At least one of filter, search, or match_all must be provided.',
  details: {
    errors: {
      '': ['At least one of filter, search, or match_all must be provided.'],
    },
  },
});

/** Shared 404 body for single-rule routes (get/update/delete/upsert). */
export const RULE_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'ruleNotFound',
  summary: 'No rule exists for the given ID',
  value: {
    code: ALERTING_V2_ERROR_CODES.RULE_NOT_FOUND,
    error: 'Not Found',
    message: getRuleNotFoundMessage(SAMPLE_RULE_ID),
    details: { rule_id: SAMPLE_RULE_ID },
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

/** Builds an OAS operation object from request/response examples. */
export const buildRuleOas = ({
  requestBody,
  responses = {},
}: {
  requestBody?: OasExampleEntry;
  responses?: Record<number, OasExampleEntry>;
}): AlertingOasOperationObject => {
  const operation: AlertingOasOperationObject = {};

  if (requestBody) {
    operation.requestBody = jsonExample(requestBody.name, requestBody.summary, requestBody.value);
  }

  const responseEntries: Record<string, ReturnType<typeof jsonExample>> = {};
  for (const [status, example] of Object.entries(responses)) {
    responseEntries[status] = jsonExample(example.name, example.summary, example.value);
  }
  if (Object.keys(responseEntries).length > 0) {
    operation.responses = responseEntries;
  }

  return operation;
};
