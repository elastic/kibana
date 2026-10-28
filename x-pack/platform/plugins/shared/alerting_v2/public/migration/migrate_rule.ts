/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  ALERTING_V2_ACTION_POLICY_API_PATH,
  ALERTING_V2_RULE_API_PATH,
} from '@kbn/alerting-v2-constants';
import type { ActionPolicyResponse, CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { buildInlineWorkflowYaml } from '@kbn/alerting-v2-rule-form';
import { WorkflowApi } from '@kbn/workflows-ui';
import { convertClassicRule } from './convert_classic_rule';
import { isMigratedActionPolicyReady } from './is_migrated_action_policy_ready';
import type { ClassicRule, MigratedActionPolicy, RuleMigration, RuleTypeMigration } from './types';

export const migrateRule = (
  rule: ClassicRule,
  ruleTypeMigration: RuleTypeMigration
): RuleMigration => convertClassicRule(rule, ruleTypeMigration);

const createActionPolicy = async (
  http: HttpStart,
  workflowApi: WorkflowApi,
  { sourceActionId, stepType, connectorId, params, policy }: MigratedActionPolicy
): Promise<string> => {
  const workflow = await workflowApi.createWorkflow({
    yaml: buildInlineWorkflowYaml({
      id: sourceActionId,
      source: 'inline',
      stepType,
      connectorId,
      params,
    }),
  });

  try {
    const { id } = await http.post<ActionPolicyResponse>(ALERTING_V2_ACTION_POLICY_API_PATH, {
      body: JSON.stringify({ ...policy, destinations: [{ type: 'workflow', id: workflow.id }] }),
    });
    return id;
  } catch (error) {
    await workflowApi.deleteWorkflow(workflow.id).catch(() => undefined);
    throw error;
  }
};

export const createMigratedRule = async (
  http: HttpStart,
  rule: CreateRuleData
): Promise<string> => {
  const { id } = await http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
    body: JSON.stringify(rule),
  });
  return id;
};

/**
 * Creates a single-step workflow and action policy for each ready converted action. Policies
 * that still need input (e.g. a Slack v2 connector) are skipped.
 */
export const createMigratedActionPolicies = async (
  http: HttpStart,
  actionPolicies: MigratedActionPolicy[]
): Promise<string[]> => {
  const workflowApi = new WorkflowApi(http);
  const actionPolicyIds: string[] = [];
  for (const actionPolicy of actionPolicies.filter(isMigratedActionPolicyReady)) {
    actionPolicyIds.push(await createActionPolicy(http, workflowApi, actionPolicy));
  }
  return actionPolicyIds;
};
