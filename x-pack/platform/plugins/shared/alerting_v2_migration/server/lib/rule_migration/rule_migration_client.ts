/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { buildInlineWorkflowYaml } from '@kbn/alerting-v2-utils';
import type { ActionPolicyClientApi, RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { MIGRATION_LOG_CODES } from '../log_codes';
import { convertClassicRule, isMigratedActionPolicyReady } from './convert_classic_rule';
import type { RuleMigrationRegistry } from './rule_migration_registry';
import type {
  ClassicRule,
  MigratedActionPolicy,
  RuleMigration,
  RuleMigrationResult,
} from './types';

type MigrationRulesClient = Pick<RulesClientApi, 'createRule' | 'deleteRule'>;
type MigrationActionPolicyClient = Pick<
  ActionPolicyClientApi,
  'createActionPolicy' | 'deleteActionPolicy'
>;
type MigrationWorkflowsManagement = Pick<
  WorkflowsServerPluginSetup['management'],
  'createWorkflow' | 'deleteWorkflows'
>;

export interface RuleMigrationClientOptions {
  request: KibanaRequest;
  spaceId: string;
  registry: RuleMigrationRegistry;
  rulesClient: MigrationRulesClient;
  actionPolicyClient: MigrationActionPolicyClient;
  workflowsManagement: MigrationWorkflowsManagement;
  logger: Logger;
}

interface CreatedResources {
  ruleId?: string;
  actionPolicyIds: string[];
  workflowIds: string[];
}

/** Converts classic rules of registered rule types into v2 rules and simple action policies. */
export class RuleMigrationClient {
  private readonly request: KibanaRequest;
  private readonly spaceId: string;
  private readonly registry: RuleMigrationRegistry;
  private readonly rulesClient: MigrationRulesClient;
  private readonly actionPolicyClient: MigrationActionPolicyClient;
  private readonly workflowsManagement: MigrationWorkflowsManagement;
  private readonly logger: Logger;

  constructor({
    request,
    spaceId,
    registry,
    rulesClient,
    actionPolicyClient,
    workflowsManagement,
    logger,
  }: RuleMigrationClientOptions) {
    this.request = request;
    this.spaceId = spaceId;
    this.registry = registry;
    this.rulesClient = rulesClient;
    this.actionPolicyClient = actionPolicyClient;
    this.workflowsManagement = workflowsManagement;
    this.logger = logger;
  }

  /** Whether the rule type has a registered migration. */
  public canMigrate(ruleTypeId: string): boolean {
    return this.registry.has(ruleTypeId);
  }

  /**
   * Converts a classic rule without creating anything; returns `undefined` when its type has
   * no registered migration.
   */
  public convert(rule: ClassicRule): RuleMigration | undefined {
    const definition = this.registry.get(rule.ruleTypeId);
    return definition ? convertClassicRule(rule, definition) : undefined;
  }

  /**
   * Converts a classic rule, then creates the v2 rule plus a single-step workflow and action
   * policy for each ready action. If any step fails, everything created so far is deleted.
   */
  public async migrate(rule: ClassicRule): Promise<RuleMigrationResult> {
    const migration = this.convert(rule);
    if (!migration) {
      throw Boom.badRequest(`Rule type "${rule.ruleTypeId}" has no registered migration`);
    }

    const readyPolicies = migration.actionPolicies.filter(isMigratedActionPolicyReady);
    const created: CreatedResources = { actionPolicyIds: [], workflowIds: [] };

    try {
      const { id: ruleId } = await this.rulesClient.createRule({ data: migration.rule });
      created.ruleId = ruleId;

      for (const actionPolicy of readyPolicies) {
        await this.createActionPolicy(actionPolicy, created);
      }

      return {
        ruleId,
        actionPolicyIds: created.actionPolicyIds,
        pendingActionPolicies: migration.actionPolicies.filter(
          (actionPolicy) => !isMigratedActionPolicyReady(actionPolicy)
        ),
        skippedActions: migration.skippedActions,
      };
    } catch (error) {
      await this.rollback(created);
      throw error;
    }
  }

  private async createActionPolicy(
    { sourceActionId, stepType, connectorId, params, policy }: MigratedActionPolicy,
    created: CreatedResources
  ): Promise<void> {
    const yaml = buildInlineWorkflowYaml({ stepType, connectorId, params });
    const { id: workflowId } = await this.workflowsManagement.createWorkflow(
      { yaml },
      this.spaceId,
      this.request
    );
    created.workflowIds.push(workflowId);

    const { id: actionPolicyId } = await this.actionPolicyClient.createActionPolicy({
      data: { ...policy, destinations: [{ type: 'workflow', id: workflowId }] },
    });
    created.actionPolicyIds.push(actionPolicyId);

    this.logger.debug(
      () => `Migrated classic action ${sourceActionId} to action policy ${actionPolicyId}`
    );
  }

  /** Deletes what a failed migration created, most dependent first. */
  private async rollback({ ruleId, actionPolicyIds, workflowIds }: CreatedResources) {
    for (const id of actionPolicyIds) {
      await this.attemptCleanup({ policy_id: id }, () =>
        this.actionPolicyClient.deleteActionPolicy({ id })
      );
    }
    for (const id of workflowIds) {
      await this.attemptCleanup({ workflow_id: id }, () =>
        this.workflowsManagement.deleteWorkflows([id], this.spaceId, this.request)
      );
    }
    if (ruleId) {
      await this.attemptCleanup({ rule_id: ruleId }, () => this.rulesClient.deleteRule({ id: ruleId }));
    }
  }

  private async attemptCleanup(labels: Record<string, string>, cleanup: () => Promise<unknown>) {
    try {
      await cleanup();
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to undo part of a rule migration', {
        labels: {
          ...labels,
          space_id: this.spaceId,
          code: MIGRATION_LOG_CODES.RULE_MIGRATION_ROLLBACK_FAILED,
        },
        error: {
          message: normalizedError.message,
          stack_trace: normalizedError.stack,
          type: normalizedError.name,
        },
      });
    }
  }
}
