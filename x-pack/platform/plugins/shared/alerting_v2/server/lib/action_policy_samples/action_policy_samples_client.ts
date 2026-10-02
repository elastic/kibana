/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  InstallActionPolicySamplesResponse,
  InstallActionPolicySampleStatus,
} from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { ActionPolicyClient } from '../action_policy_client';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { getActionPolicySamplesWorkflowsUnavailableMessage } from '../errors/action_policy_error_messages';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { LicenseServiceToken } from '../services/license_service/tokens';
import type { LicenseServiceContract } from '../services/license_service/license_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { buildConsoleLogWorkflowYaml } from './console_log_workflow';
import { getSampleActionPolicyId, getSampleWorkflowId } from './ids';
import { ACTION_POLICY_SAMPLES, type ActionPolicySample } from './samples';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

const CONFLICT_STATUS_CODE = 409;

const hasConflictStatus = (error: unknown): boolean =>
  Boom.isBoom(error)
    ? error.output.statusCode === CONFLICT_STATUS_CODE
    : (error as { statusCode?: number } | null)?.statusCode === CONFLICT_STATUS_CODE;

/**
 * Installs the sample action policies, and the sample console log workflow they dispatch to,
 * in the space of the current request. Existing resources are never modified.
 */
@injectable()
export class ActionPolicySamplesClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(ActionPolicyClient) private readonly actionPolicyClient: ActionPolicyClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsManagementApi,
    @inject(LicenseServiceToken) private readonly licenseService: LicenseServiceContract
  ) {}

  public async installSamples(): Promise<InstallActionPolicySamplesResponse> {
    await this.licenseService.assertActionPoliciesLicense();

    if (!this.workflowsManagement.isWorkflowsAvailable) {
      throw Boom.forbidden(getActionPolicySamplesWorkflowsUnavailableMessage(), {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_SAMPLES_WORKFLOWS_UNAVAILABLE,
      });
    }

    const samples = await this.resolveSamples();
    const workflow = await this.ensureWorkflow(samples.some(({ exists }) => !exists));

    const policies: InstallActionPolicySamplesResponse['policies'] = [];
    for (const { sample, id, exists } of samples) {
      const { name } = sample.data;
      if (exists) {
        policies.push({ id, name, status: 'skipped' });
        continue;
      }

      const status = await this.createPolicy({ sample, id, workflowId: workflow.id });
      policies.push({ id, name, status });
    }

    return { workflow, policies };
  }

  private async resolveSamples(): Promise<
    Array<{ sample: ActionPolicySample; id: string; exists: boolean }>
  > {
    return Promise.all(
      ACTION_POLICY_SAMPLES.map(async (sample) => {
        const id = getSampleActionPolicyId(this.spaceId, sample.key);
        const exists = await this.actionPolicyClient.actionPolicyExists({ id });
        return { sample, id, exists };
      })
    );
  }

  /**
   * Looks the workflow up by its deterministic id and creates it when missing. The workflow is only
   * created when at least one policy needs it, so a repeated call never recreates it needlessly.
   */
  private async ensureWorkflow(
    needed: boolean
  ): Promise<{ id: string; status: InstallActionPolicySampleStatus }> {
    const id = getSampleWorkflowId(this.spaceId);
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
      // previously deleted sample workflow cannot be recreated under the same id.
      const created = await this.workflowsManagement.createWorkflow(
        { yaml },
        this.spaceId,
        this.request
      );
      return { id: created.id, status: 'created' };
    }
  }

  private async createPolicy({
    sample,
    id,
    workflowId,
  }: {
    sample: ActionPolicySample;
    id: string;
    workflowId: string;
  }): Promise<InstallActionPolicySampleStatus> {
    try {
      await this.actionPolicyClient.createActionPolicy({
        data: { ...sample.data, destinations: [{ type: 'workflow', id: workflowId }] },
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
