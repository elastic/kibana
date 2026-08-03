/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  createRuleDataSchema,
  updateRuleBodySchema,
  ruleResponseSchema,
  findRulesResponseSchema,
  ruleTagsResponseSchema,
  bulkGetRulesParamsSchema,
  bulkGetRulesResponseSchema,
  querySchema,
  composedQuerySchema,
  standaloneQuerySchema,
  scheduleSchema,
  metadataSchema,
  groupingSchema,
} from './rule_data_schema';
import {
  createActionPolicyDataSchema,
  updateActionPolicyBodySchema,
  bulkSnoozeActionPoliciesBodySchema,
  snoozeActionPolicyBodySchema,
  actionPolicyDestinationSchema,
  groupingModeSchema,
} from './action_policy_data_schema';
import {
  actionPolicyResponseSchema,
  findActionPoliciesResponseSchema,
} from './action_policy_response_schema';
import {
  createAckAlertActionBodySchema,
  createUnackAlertActionBodySchema,
  createAssignAlertActionBodySchema,
  createTagAlertActionBodySchema,
  createSnoozeAlertActionBodySchema,
  createUnsnoozeAlertActionBodySchema,
  createActivateAlertActionBodySchema,
  createDeactivateAlertActionBodySchema,
  createAlertActionBodySchema,
  bulkCreateAlertActionItemBodySchema,
  bulkCreateAlertActionBodySchema,
} from './alert_action_schema';
import {
  matchActionPoliciesForRuleBodySchema,
  matchedActionPolicySchema,
  matchActionPoliciesForRuleResponseSchema,
} from './matched_action_policies_response_schema';
import {
  ruleExecutionViewSchema,
  listRuleExecutionsResponseSchema,
} from './rule_execution_history_schema';
import {
  policyExecutionHistoryItemSchema,
  listPolicyExecutionHistoryResponseSchema,
} from './policy_execution_history_schema';
import {
  bulkByIdsSchema,
  bulkByQuerySchema,
  bulkResponseSchema,
  dryRunResponseSchema,
} from './bulk_operation_schema';
import { errorResponseSchema } from './error_response_schema';

/**
 * These tests guard the OAS component naming contract (rna-program#375):
 * every public request/response schema — and the nested schemas they reuse —
 * must carry a stable `.meta({ id })` so Kibana's OAS emits named `$ref`
 * components (consumed by the Terraform provider) instead of anonymous inline
 * objects. Every id is namespaced with `alerting_v2_` to stay unique across the
 * shared OAS document (alerting v1 already claims ids like `rule_response`).
 */
const getMeta = (schema: z.ZodType): { id?: string; description?: string } =>
  (z.globalRegistry.get(schema) as { id?: string; description?: string } | undefined) ?? {};

const getMetaId = (schema: z.ZodType): string | undefined => getMeta(schema).id;

const EXPECTED_IDS: ReadonlyArray<readonly [z.ZodType, string]> = [
  // rules
  [createRuleDataSchema, 'alerting_v2_new_rule'],
  [updateRuleBodySchema, 'alerting_v2_update_rule'],
  [ruleResponseSchema, 'alerting_v2_rule_response'],
  [findRulesResponseSchema, 'alerting_v2_rule_list_response'],
  [ruleTagsResponseSchema, 'alerting_v2_rule_tags_response'],
  [bulkGetRulesParamsSchema, 'alerting_v2_bulk_get_rules_request'],
  [bulkGetRulesResponseSchema, 'alerting_v2_bulk_get_rules_response'],
  [querySchema, 'alerting_v2_rule_query'],
  [composedQuerySchema, 'alerting_v2_composed_rule_query'],
  [standaloneQuerySchema, 'alerting_v2_standalone_rule_query'],
  [scheduleSchema, 'alerting_v2_rule_schedule'],
  [metadataSchema, 'alerting_v2_rule_metadata'],
  [groupingSchema, 'alerting_v2_rule_grouping'],
  // action policies
  [createActionPolicyDataSchema, 'alerting_v2_new_action_policy'],
  [updateActionPolicyBodySchema, 'alerting_v2_update_action_policy'],
  [bulkSnoozeActionPoliciesBodySchema, 'alerting_v2_bulk_snooze_action_policies_request'],
  [snoozeActionPolicyBodySchema, 'alerting_v2_snooze_action_policy_request'],
  [actionPolicyDestinationSchema, 'alerting_v2_action_policy_destination'],
  [groupingModeSchema, 'alerting_v2_action_policy_grouping_mode'],
  [actionPolicyResponseSchema, 'alerting_v2_action_policy_response'],
  [findActionPoliciesResponseSchema, 'alerting_v2_action_policy_list_response'],
  // alert actions
  [createAckAlertActionBodySchema, 'alerting_v2_new_ack_alert_action'],
  [createUnackAlertActionBodySchema, 'alerting_v2_new_unack_alert_action'],
  [createAssignAlertActionBodySchema, 'alerting_v2_new_assign_alert_action'],
  [createTagAlertActionBodySchema, 'alerting_v2_new_tag_alert_action'],
  [createSnoozeAlertActionBodySchema, 'alerting_v2_new_snooze_alert_action'],
  [createUnsnoozeAlertActionBodySchema, 'alerting_v2_new_unsnooze_alert_action'],
  [createActivateAlertActionBodySchema, 'alerting_v2_new_activate_alert_action'],
  [createDeactivateAlertActionBodySchema, 'alerting_v2_new_deactivate_alert_action'],
  [createAlertActionBodySchema, 'alerting_v2_alert_action'],
  [bulkCreateAlertActionItemBodySchema, 'alerting_v2_bulk_create_alert_action_item'],
  [bulkCreateAlertActionBodySchema, 'alerting_v2_bulk_create_alert_actions_request'],
  // matched policies
  [matchActionPoliciesForRuleBodySchema, 'alerting_v2_match_action_policies_for_rule_request'],
  [matchedActionPolicySchema, 'alerting_v2_matched_action_policy'],
  [matchActionPoliciesForRuleResponseSchema, 'alerting_v2_match_action_policies_for_rule_response'],
  // execution history
  [ruleExecutionViewSchema, 'alerting_v2_rule_execution'],
  [listRuleExecutionsResponseSchema, 'alerting_v2_rule_executions_response'],
  [policyExecutionHistoryItemSchema, 'alerting_v2_policy_execution_history_item'],
  [listPolicyExecutionHistoryResponseSchema, 'alerting_v2_policy_execution_history_response'],
  // shared bulk primitives, reused by every by-ID / by-query bulk endpoint
  [bulkByIdsSchema, 'alerting_v2_bulk_by_ids_request'],
  [bulkByQuerySchema, 'alerting_v2_bulk_by_query_request'],
  [bulkResponseSchema, 'alerting_v2_bulk_operation_response'],
  [dryRunResponseSchema, 'alerting_v2_bulk_dry_run_response'],
  [errorResponseSchema, 'alerting_v2_error_response'],
];

/** Discriminated unions whose every variant must be named for OAS to emit a discriminator mapping. */
const DISCRIMINATED_UNIONS: ReadonlyArray<readonly [string, z.ZodType]> = [
  ['querySchema', querySchema],
  ['actionPolicyDestinationSchema', actionPolicyDestinationSchema],
  ['createAlertActionBodySchema', createAlertActionBodySchema],
];

describe('alerting v2 OAS component ids', () => {
  it('registers a stable, alerting_v2-namespaced id on every public request/response schema', () => {
    for (const [schema, expectedId] of EXPECTED_IDS) {
      expect(getMetaId(schema)).toBe(expectedId);
    }
  });

  it('namespaces every id under alerting_v2_ so it stays unique in the shared OAS document', () => {
    for (const [, expectedId] of EXPECTED_IDS) {
      expect(expectedId.startsWith('alerting_v2_')).toBe(true);
    }
  });

  it('uses unique ids across all named schemas', () => {
    const ids = EXPECTED_IDS.map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('retains .describe() metadata when chained with .meta({ id })', () => {
    // querySchema is defined as `.describe(...).meta({ id })`; the description must survive
    // the merge so the generated OAS component keeps its documentation.
    const meta = getMeta(querySchema);
    expect(meta.description).toBe('Detection query configuration.');
    expect(meta.id).toBe('alerting_v2_rule_query');
  });

  it('names every variant of each discriminated union so a discriminator mapping is emitted', () => {
    for (const [name, union] of DISCRIMINATED_UNIONS) {
      const options = (union as unknown as { _zod: { def: { options?: z.ZodType[] } } })._zod.def
        .options;
      expect(Array.isArray(options)).toBe(true);
      for (const option of options ?? []) {
        expect({ union: name, id: getMetaId(option) }).toEqual({
          union: name,
          id: expect.stringMatching(/^alerting_v2_/),
        });
      }
    }
  });
});
