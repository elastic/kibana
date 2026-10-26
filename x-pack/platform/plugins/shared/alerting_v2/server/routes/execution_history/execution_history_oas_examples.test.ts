/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  listPolicyExecutionHistoryResponseSchema,
  listRuleExecutionsResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { LIST_ACTION_POLICY_EXECUTIONS_RESPONSE } from './list_action_policy_executions_oas_example';
import { LIST_RULE_EXECUTIONS_RESPONSE } from './list_rule_executions_oas_example';

describe('execution history OAS example payloads', () => {
  it('keeps the rule executions response example valid against listRuleExecutionsResponseSchema', () => {
    expect(listRuleExecutionsResponseSchema.safeParse(LIST_RULE_EXECUTIONS_RESPONSE).success).toBe(
      true
    );
  });

  it('keeps the action policy executions response example valid against listPolicyExecutionHistoryResponseSchema', () => {
    expect(
      listPolicyExecutionHistoryResponseSchema.safeParse(LIST_ACTION_POLICY_EXECUTIONS_RESPONSE)
        .success
    ).toBe(true);
  });
});
