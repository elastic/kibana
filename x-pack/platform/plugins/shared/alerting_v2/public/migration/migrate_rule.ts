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
import type { ActionPolicyResponse, RuleResponse } from '@kbn/alerting-v2-schemas';
import { buildInlineWorkflowYaml } from '@kbn/alerting-v2-rule-form';
import { WorkflowApi } from '@kbn/workflows-ui';
import { createRuleMigrationService } from './rule_migration_service';
import type {
  ClassicRule,
  CreatedRuleMigration,
  MigratedActionPolicy,
  RuleMigration,
} from './types';

const ruleMigrationService = createRuleMigrationService();

export const migrateRule = (rule: ClassicRule): RuleMigration | undefined =>
  ruleMigrationService.migrate(rule);

/** Policies whose workflow step has everything it needs; the rest need user input first. */
export const isActionPolicyReady = ({ connectorId, notes }: MigratedActionPolicy): boolean =>
  connectorId !== null && !notes.includes('connector_required');

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

/**
 * Creates the migrated rule, then a single-step workflow and action policy for each ready
 * converted action. Policies that still need input (e.g. a Slack v2 connector) are skipped.
 */
export const createMigratedRule = async (
  http: HttpStart,
  { rule, actionPolicies }: RuleMigration
): Promise<CreatedRuleMigration> => {
  const { id: ruleId } = await http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
    body: JSON.stringify(rule),
  });

  const workflowApi = new WorkflowApi(http);
  const actionPolicyIds: string[] = [];
  for (const actionPolicy of actionPolicies.filter(isActionPolicyReady)) {
    actionPolicyIds.push(await createActionPolicy(http, workflowApi, actionPolicy));
  }

  return { ruleId, actionPolicyIds };
};
