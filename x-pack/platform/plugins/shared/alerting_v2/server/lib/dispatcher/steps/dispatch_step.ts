/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  NotificationGroup,
  NotificationPolicyWorkflowPayload,
} from '../types';
import { WorkflowsManagementApiToken } from './dispatch_step_tokens';

const NOTIFICATION_POLICY_TRIGGER = 'notification_policy';

@injectable()
export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management']
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatch = [], policies } = state;

    for (const group of dispatch) {
      const policy = policies?.get(group.policyId);
      const apiKey = policy?.apiKey;

      if (!apiKey) {
        this.logger.warn({
          message: () =>
            `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`,
        });
        continue;
      }

      const fakeRequest = this.craftFakeRequest(apiKey);

      for (const destination of group.destinations) {
        if (destination.type !== 'workflow') {
          continue;
        }

        await this.dispatchWorkflow(group, destination.id, fakeRequest);
      }
    }

    return { type: 'continue' };
  }

  private craftFakeRequest(apiKey: string): KibanaRequest {
    const requestHeaders: Headers = {
      authorization: `ApiKey ${apiKey}`,
    };

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
      path: '/',
    };

    return kibanaRequestFactory(fakeRawRequest);
  }

  private async dispatchWorkflow(
    group: NotificationGroup,
    workflowId: string,
    request: KibanaRequest
  ): Promise<void> {
    const workflow = await this.workflowsManagement.getWorkflow(workflowId, group.spaceId);

    if (!workflow) {
      this.logger.warn({
        message: () => `Workflow ${workflowId} not found, skipping dispatch for group ${group.id}`,
      });
      return;
    }

    if (!workflow.enabled) {
      this.logger.warn({
        message: () =>
          `Workflow ${workflowId} is disabled, enable it to dispatch for group ${group.id}`,
      });
      return;
    }

    const model: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition ?? undefined,
      yaml: workflow.yaml,
    };

    const payload: NotificationPolicyWorkflowPayload = {
      id: group.id,
      ruleId: group.ruleId,
      policyId: group.policyId,
      groupKey: group.groupKey,
      episodes: group.episodes,
    };

    this.logger.debug({
      message: () =>
        `Dispatching notification group ${group.id} to workflow ${workflowId} for policy ${group.policyId}`,
    });

    const executionId = await this.workflowsManagement.scheduleWorkflow(
      model,
      group.spaceId,
      payload,
      request,
      NOTIFICATION_POLICY_TRIGGER
    );

    this.logger.debug({
      message: () =>
        `Workflow ${workflowId} execution scheduled with id ${executionId} for group ${group.id}`,
    });
  }
}
