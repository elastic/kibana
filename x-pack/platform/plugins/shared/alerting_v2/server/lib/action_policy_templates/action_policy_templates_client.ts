/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  InstallActionPolicyTemplatesResponse,
  InstallActionPolicyTemplateStatus,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../action_policy_client';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { getActionPolicyTemplatesWorkflowsUnavailableMessage } from '../errors/action_policy_error_messages';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { LicenseServiceToken } from '../services/license_service/tokens';
import type { LicenseServiceContract } from '../services/license_service/license_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { buildConsoleLogWorkflowYaml } from './console_log_workflow';
import { getTemplateActionPolicyId, getTemplateWorkflowId } from './ids';
import { ACTION_POLICY_TEMPLATES, type ActionPolicyTemplate } from './templates';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

const CONFLICT_STATUS_CODE = 409;

const hasConflictStatus = (error: unknown): boolean =>
  Boom.isBoom(error)
    ? error.output.statusCode === CONFLICT_STATUS_CODE
    : (error as { statusCode?: number } | null)?.statusCode === CONFLICT_STATUS_CODE;

/**
 * Installs the template action policies, and the placeholder console log workflow they dispatch to,
 * in the space of the current request. Existing resources are never modified.
 */
@injectable()
export class ActionPolicyTemplatesClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsManagementApi,
    @inject(LicenseServiceToken) private readonly licenseService: LicenseServiceContract
  ) {}

  public async installTemplates(): Promise<InstallActionPolicyTemplatesResponse> {
    await this.licenseService.assertActionPoliciesLicense();

    if (!this.workflowsManagement.isWorkflowsAvailable) {
      throw Boom.forbidden(getActionPolicyTemplatesWorkflowsUnavailableMessage(), {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_TEMPLATES_WORKFLOWS_UNAVAILABLE,
      });
    }

    const templates = await this.resolveTemplates();
    const workflow = await this.ensureWorkflow(templates.some(({ exists }) => !exists));

    const policies: InstallActionPolicyTemplatesResponse['policies'] = [];
    for (const { template, id, exists } of templates) {
      const { name } = template.data;
      if (exists) {
        policies.push({ id, name, status: 'skipped' });
        continue;
      }

      const status = await this.createPolicy({ template, id, workflowId: workflow.id });
      policies.push({ id, name, status });
    }

    return { workflow, policies };
  }

  private async resolveTemplates(): Promise<
    Array<{ template: ActionPolicyTemplate; id: string; exists: boolean }>
  > {
    return Promise.all(
      ACTION_POLICY_TEMPLATES.map(async (template) => {
        const id = getTemplateActionPolicyId(this.spaceId, template.key);
        const exists = await this.actionPolicyClient.actionPolicyExists({ id });
        return { template, id, exists };
      })
    );
  }

  /**
   * Looks the workflow up by its deterministic id and creates it when missing. The workflow is only
   * created when at least one policy needs it, so a repeated call never recreates it needlessly.
   */
  private async ensureWorkflow(
    needed: boolean
  ): Promise<{ id: string; status: InstallActionPolicyTemplateStatus }> {
    const id = getTemplateWorkflowId(this.spaceId);
    const [existing] = await this.workflowsManagement.getWorkflowsByIds(
      [id],
      this.spaceId,
      this.request
    );
    if (existing || !needed) {
      return { id, status: 'skipped' };
    }

    const yaml = buildConsoleLogWorkflowYaml();
    try {
      const created = await this.workflowsManagement.createWorkflow(
        { id, yaml },
        this.spaceId,
        this.request
      );
      return { id: created.id, status: 'created' };
    } catch (error) {
      if (!hasConflictStatus(error)) {
        throw error;
      }
      // Workflow ids are unique across spaces and soft-deleted workflows keep reserving theirs, so a
      // previously deleted template workflow cannot be recreated under the same id.
      const created = await this.workflowsManagement.createWorkflow(
        { yaml },
        this.spaceId,
        this.request
      );
      return { id: created.id, status: 'created' };
    }
  }

  private async createPolicy({
    template,
    id,
    workflowId,
  }: {
    template: ActionPolicyTemplate;
    id: string;
    workflowId: string;
  }): Promise<InstallActionPolicyTemplateStatus> {
    try {
      await this.actionPolicyClient.createActionPolicy({
        data: { ...template.data, destinations: [{ type: 'workflow', id: workflowId }] },
        options: { id, enabled: false },
      });
      return 'created';
    } catch (error) {
      if (hasConflictStatus(error)) {
        return 'skipped';
      }
      throw error;
    }
  }
}
