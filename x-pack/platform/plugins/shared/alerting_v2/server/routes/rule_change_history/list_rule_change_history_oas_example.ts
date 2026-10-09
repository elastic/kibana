/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListRuleChangeHistoryResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject, OasExampleEntry } from '../oas_types';

export const LIST_RULE_CHANGE_HISTORY_RESPONSE: ListRuleChangeHistoryResponse = {
  items: [
    {
      id: '0194f0c8-aaaa-7bbb-8ccc-ddddeeeeffff',
      timestamp: '2026-01-15T12:05:00.000Z',
      actor: { name: 'elastic', profileId: 'u_profile_1' },
      action: 'rule_update',
      changes: {
        count: 1,
        summary: { metadata: { name: 'Host CPU high' } },
      },
      isCurrent: true,
      metadata: { version: 2 },
    },
    {
      id: '0194f0c8-1111-7222-8333-444455556666',
      timestamp: '2026-01-15T12:00:00.000Z',
      actor: { name: 'elastic', profileId: 'u_profile_1' },
      action: 'rule_create',
      metadata: { version: 1 },
    },
  ],
  total: 2,
};

const INVALID_RULE_CHANGE_HISTORY_QUERY_RESPONSE = invalidResponseExample({
  summary: 'Exceeds the max result window',
  message: 'page * per_page cannot exceed 10000.',
  details: { errors: { page: ['page * per_page cannot exceed 10000.'] } },
});

export const RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE: OasExampleEntry = {
  name: 'ruleChangeHistoryUnavailable',
  summary: 'Change history data stream is not initialized',
  value: {
    code: ALERTING_ERROR_CODES.RULE_CHANGE_HISTORY_UNAVAILABLE,
    error: 'Service Unavailable',
    message: 'Rule change history is unavailable',
  },
};

export const listRuleChangeHistoryOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'listRuleChangeHistoryResponse',
        summary: 'Two rule change-history events (newest first)',
        value: LIST_RULE_CHANGE_HISTORY_RESPONSE,
      },
      400: INVALID_RULE_CHANGE_HISTORY_QUERY_RESPONSE,
      503: RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE,
    },
  });
