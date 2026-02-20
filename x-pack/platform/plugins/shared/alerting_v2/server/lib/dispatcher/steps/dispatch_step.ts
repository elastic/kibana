/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  NotificationGroup,
} from '../types';

export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    private readonly workflowsManagement: WorkflowsManagementApi,
    private readonly logger: LoggerServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatch = [], policies = new Map() } = state;

    for (const group of dispatch) {
      const policy = policies.get(group.policyId);
      if (!policy?.apiKey) {
        this.logger.debug({
          message: () =>
            `Skipping dispatch for group ${group.id}: notification policy ${group.policyId} has no API key`,
        });
        continue;
      }
      const fakeRequest = this.craftFakeRequest(policy.apiKey);
      await this.dispatchWorkflow(group, fakeRequest);
    }

    return { type: 'continue' };
  }

  private craftFakeRequest(apiKey: string): KibanaRequest {
    const fakeRawRequest: FakeRawRequest = {
      headers: { authorization: `ApiKey ${apiKey}` },
      path: '/',
    };
    return kibanaRequestFactory(fakeRawRequest);
  }

  private async dispatchWorkflow(group: NotificationGroup, request: KibanaRequest): Promise<void> {
    const spaceId = 'default';

    const workflow = await this.workflowsManagement.getWorkflow(group.workflowId, spaceId);
    if (!workflow) {
      return;
    }

    void this.workflowsManagement.runWorkflow(
      {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        definition: workflow.definition as WorkflowYaml,
        yaml: workflow.yaml,
      },
      spaceId,
      group,
      request
    );
  }
}
