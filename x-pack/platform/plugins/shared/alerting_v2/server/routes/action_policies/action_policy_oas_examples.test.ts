/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyResponseSchema,
  actionPolicyTagsResponseSchema,
  bulkByIdsSchema,
  bulkResponseSchema,
  bulkSnoozeActionPoliciesBodySchema,
  createActionPolicyDataSchema,
  findActionPoliciesResponseSchema,
  listPolicyExecutionHistoryResponseSchema,
  matchActionPoliciesForRuleBodySchema,
  matchActionPoliciesForRuleResponseSchema,
  matcherDataFieldsResponseSchema,
  snoozeActionPolicyBodySchema,
  updateActionPolicyBodySchema,
} from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_RESPONSE,
  BULK_BY_IDS_REQUEST,
  BULK_RESPONSE,
  CREATE_ACTION_POLICY_REQUEST,
} from './action_policy_oas_shared_examples';
import { UPDATE_ACTION_POLICY_REQUEST } from './update_action_policy_oas_example';
import { LIST_ACTION_POLICIES_RESPONSE } from './list_action_policies_oas_example';
import { SNOOZE_ACTION_POLICY_REQUEST } from './snooze_action_policy_oas_example';
import { BULK_SNOOZE_ACTION_POLICIES_REQUEST } from './bulk_snooze_action_policies_oas_example';
import {
  MATCH_ACTION_POLICIES_FOR_RULE_REQUEST,
  MATCH_ACTION_POLICIES_FOR_RULE_RESPONSE,
} from './match_action_policies_for_rule_oas_example';
import { LIST_EXECUTION_HISTORY_RESPONSE } from './list_execution_history_oas_example';
import { MATCHER_DATA_FIELDS_RESPONSE } from '../suggestions/matcher_data_fields_oas_example';
import { ACTION_POLICY_TAGS_RESPONSE } from '../suggestions/action_policy_tags_oas_example';

describe('action policy OAS example payloads', () => {
  it('keeps create request example valid against createActionPolicyDataSchema', () => {
    expect(createActionPolicyDataSchema.safeParse(CREATE_ACTION_POLICY_REQUEST).success).toBe(true);
  });

  it('keeps action policy response example valid against actionPolicyResponseSchema', () => {
    expect(actionPolicyResponseSchema.safeParse(ACTION_POLICY_RESPONSE).success).toBe(true);
  });

  it('keeps update request example valid against updateActionPolicyBodySchema', () => {
    expect(updateActionPolicyBodySchema.safeParse(UPDATE_ACTION_POLICY_REQUEST).success).toBe(true);
  });

  it('keeps snooze request example valid against snoozeActionPolicyBodySchema', () => {
    expect(snoozeActionPolicyBodySchema.safeParse(SNOOZE_ACTION_POLICY_REQUEST).success).toBe(true);
  });

  it('keeps list response example valid against findActionPoliciesResponseSchema', () => {
    expect(findActionPoliciesResponseSchema.safeParse(LIST_ACTION_POLICIES_RESPONSE).success).toBe(
      true
    );
  });

  it('keeps bulk-by-ids request example valid against bulkByIdsSchema', () => {
    expect(bulkByIdsSchema.safeParse(BULK_BY_IDS_REQUEST).success).toBe(true);
  });

  it('keeps bulk response example valid against bulkResponseSchema', () => {
    expect(bulkResponseSchema.safeParse(BULK_RESPONSE).success).toBe(true);
  });

  it('keeps bulk snooze request example valid against bulkSnoozeActionPoliciesBodySchema', () => {
    expect(
      bulkSnoozeActionPoliciesBodySchema.safeParse(BULK_SNOOZE_ACTION_POLICIES_REQUEST).success
    ).toBe(true);
  });

  it('keeps match request example valid against matchActionPoliciesForRuleBodySchema', () => {
    expect(
      matchActionPoliciesForRuleBodySchema.safeParse(MATCH_ACTION_POLICIES_FOR_RULE_REQUEST).success
    ).toBe(true);
  });

  it('keeps match response example valid against matchActionPoliciesForRuleResponseSchema', () => {
    expect(
      matchActionPoliciesForRuleResponseSchema.safeParse(MATCH_ACTION_POLICIES_FOR_RULE_RESPONSE)
        .success
    ).toBe(true);
  });

  it('keeps execution history response example valid against listPolicyExecutionHistoryResponseSchema', () => {
    expect(
      listPolicyExecutionHistoryResponseSchema.safeParse(LIST_EXECUTION_HISTORY_RESPONSE).success
    ).toBe(true);
  });

  it('keeps matcher data fields example valid against matcherDataFieldsResponseSchema', () => {
    expect(matcherDataFieldsResponseSchema.safeParse(MATCHER_DATA_FIELDS_RESPONSE).success).toBe(
      true
    );
  });

  it('keeps action policy tags example valid against actionPolicyTagsResponseSchema', () => {
    expect(actionPolicyTagsResponseSchema.safeParse(ACTION_POLICY_TAGS_RESPONSE).success).toBe(
      true
    );
  });
});
