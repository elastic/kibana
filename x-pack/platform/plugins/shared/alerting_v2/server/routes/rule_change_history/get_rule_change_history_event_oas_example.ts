/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryDetail } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { RULE_RESPONSE } from '../rules/rule_oas_shared_examples';
import { buildOasOperation } from '../oas_utils';
import type { AlertingOasOperationObject, OasExampleEntry } from '../oas_types';
import { RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE } from './list_rule_change_history_oas_example';

const { version: _occVersion, ...RULE_SNAPSHOT } = RULE_RESPONSE;

export const GET_RULE_CHANGE_HISTORY_EVENT_RESPONSE: RuleChangeHistoryDetail = {
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
  snapshot: {
    ...RULE_SNAPSHOT,
    metadata: {
      ...RULE_SNAPSHOT.metadata,
      name: 'Host CPU critical',
      version: 2,
    },
  },
};

export const RULE_CHANGE_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'ruleChangeNotFound',
  summary: 'No change-history event exists for the given ID',
  value: {
    code: ALERTING_V2_ERROR_CODES.RULE_CHANGE_NOT_FOUND,
    error: 'Not Found',
    message: 'Rule change with event id "missing-event" not found for rule "rule-1"',
    details: { rule_id: 'rule-1', event_id: 'missing-event' },
  },
};

export const getRuleChangeHistoryEventOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'getRuleChangeHistoryEventResponse',
        summary: 'Retrieved rule change-history event with snapshot',
        value: GET_RULE_CHANGE_HISTORY_EVENT_RESPONSE,
      },
      404: RULE_CHANGE_NOT_FOUND_RESPONSE,
      503: RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE,
    },
  });
