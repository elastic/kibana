/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { buildInlineWorkflowYaml } from '@kbn/alerting-v2-utils';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ActionPolicyClient } from '../action_policy_client';
import { RulesClient } from '../rules_client';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type { AlertingLabels } from '../services/logger_service/types';
import { convertClassicRule, isMigratedActionPolicyReady } from './convert_classic_rule';
import { RuleMigrationRegistry } from './rule_migration_registry';
import type {
  ClassicRule,
  MigratedActionPolicy,
  RuleMigration,
  RuleMigrationResult,
} from './types';

type MigrationRulesClient = Pick<RulesClient, 'createRule' | 'deleteRule'>;
type MigrationActionPolicyClient = Pick<
  ActionPolicyClient,
  'createActionPolicy' | 'deleteActionPolicy'
>;
type MigrationWorkflowsManagement = Pick<
  WorkflowsServerPluginSetup['management'],
  'createWorkflow' | 'deleteWorkflows'
>;

interface CreatedResources {
  ruleId?: string;
  actionPolicyIds: string[];
  workflowIds: string[];
}

/** Converts classic rules of registered rule types into v2 rules and simple action policies. */
@injectable()
export class RuleMigrationClient {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(RuleMigrationRegistry) private readonly registry: RuleMigrationRegistry,
    @inject(RulesClient) private readonly rulesClient: MigrationRulesClient,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: MigrationActionPolicyClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: MigrationWorkflowsManagement,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('ruleMigration');
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

    this.logger.debug({
      message: `Migrated classic action ${sourceActionId} to action policy ${actionPolicyId}`,
    });
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

  private async attemptCleanup(labels: AlertingLabels, cleanup: () => Promise<unknown>) {
    try {
      await cleanup();
    } catch (error) {
      this.logger.warn({
        message: 'Failed to undo part of a rule migration',
        error,
        code: ALERTING_LOG_CODES.RULE_MIGRATION_ROLLBACK_FAILED,
        labels: { ...labels, space_id: this.spaceId },
      });
    }
  }
}
