/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkByIdsParams,
  BulkByQueryParams,
  BulkResponse,
  CreateRuleDataInput,
  DryRunResponse,
  ErrorResponse,
  RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { getRuleNotFoundMessage } from '../../lib/errors/rule_error_messages';
import { invalidResponseExample } from '../oas_utils';
import type { OasExampleEntry } from '../oas_types';

const SAMPLE_RULE_DATA = {
  kind: 'alert' as const,
  metadata: {
    name: 'Host CPU high',
    description: 'Alerts when average CPU usage exceeds a threshold.',
    tags: ['production', 'infra'],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  recovery_strategy: 'no_breach' as const,
  query: {
    format: 'standalone' as const,
    breach: {
      query:
        'FROM metrics-* | WHERE host.cpu.usage > 0.9 | STATS avg_cpu = AVG(host.cpu.usage) BY host.name',
    },
  },
  grouping: { fields: ['host.name'] },
  state_transition: { pending_count: 1, recovering_count: 1 },
};

export const CREATE_RULE_REQUEST: CreateRuleDataInput = SAMPLE_RULE_DATA;

export const RULE_RESPONSE: RuleResponse = {
  ...SAMPLE_RULE_DATA,
  id: 'rule-1',
  version: 'WzAsMV0=',
  enabled: true,
  createdBy: 'elastic',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

export const BULK_OPERATION_REQUEST: BulkByIdsParams = {
  ids: ['rule-1', 'rule-2'],
};

export const BULK_BY_QUERY_REQUEST: BulkByQueryParams = {
  filter: 'tags: production',
};

export const BULK_OPERATION_RESPONSE: BulkResponse = {
  affected_count: 2,
  errors: [],
};

export const DRY_RUN_RESPONSE: DryRunResponse = {
  match_count: 2,
  sample: ['rule-1', 'rule-2'],
};

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
    message: getRuleNotFoundMessage(RULE_RESPONSE.id),
    details: { rule_id: RULE_RESPONSE.id },
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
