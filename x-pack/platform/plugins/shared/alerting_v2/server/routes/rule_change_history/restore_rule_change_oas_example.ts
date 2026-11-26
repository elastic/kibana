/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { getInvalidRuleDataMessage } from '../../lib/errors/rule_error_messages';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  RULE_VERSION_CONFLICT_RESPONSE,
  ruleResponseExample,
} from '../rules/rule_oas_shared_examples';
import { RULE_CHANGE_NOT_FOUND_RESPONSE } from './get_rule_change_history_event_oas_example';
import { RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE } from './list_rule_change_history_oas_example';

const SNAPSHOT_FIELD_ERROR = 'Unrecognized key: "future_field"';

const INVALID_SNAPSHOT_RESPONSE = invalidResponseExample({
  summary: 'The stored snapshot does not fit the current rule schema',
  code: ALERTING_ERROR_CODES.INVALID_RULE_DATA,
  message: getInvalidRuleDataMessage('restore', SNAPSHOT_FIELD_ERROR),
  details: { context: 'restore', errors: { errors: [SNAPSHOT_FIELD_ERROR] } },
});

export const restoreRuleChangeOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: ruleResponseExample('restoreRuleChangeResponse', 'Restored rule configuration', {
        version: 4,
      }),
      400: INVALID_SNAPSHOT_RESPONSE,
      404: RULE_CHANGE_NOT_FOUND_RESPONSE,
      409: RULE_VERSION_CONFLICT_RESPONSE,
      503: RULE_CHANGE_HISTORY_UNAVAILABLE_RESPONSE,
    },
  });
