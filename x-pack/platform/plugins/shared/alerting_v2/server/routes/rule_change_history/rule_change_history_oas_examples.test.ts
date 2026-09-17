/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  listRuleChangeHistoryResponseSchema,
  ruleChangeHistoryDetailSchema,
} from '@kbn/alerting-v2-schemas';
import { LIST_RULE_CHANGE_HISTORY_RESPONSE } from './list_rule_change_history_oas_example';
import { GET_RULE_CHANGE_HISTORY_EVENT_RESPONSE } from './get_rule_change_history_event_oas_example';

describe('rule change history OAS example payloads', () => {
  it('keeps the list response example valid against listRuleChangeHistoryResponseSchema', () => {
    expect(
      listRuleChangeHistoryResponseSchema.safeParse(LIST_RULE_CHANGE_HISTORY_RESPONSE).success
    ).toBe(true);
  });

  it('keeps the detail response example valid against ruleChangeHistoryDetailSchema', () => {
    expect(
      ruleChangeHistoryDetailSchema.safeParse(GET_RULE_CHANGE_HISTORY_EVENT_RESPONSE).success
    ).toBe(true);
  });
});
