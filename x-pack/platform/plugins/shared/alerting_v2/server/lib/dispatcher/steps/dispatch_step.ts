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
import pLimit from 'p-limit';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  ActionGroup,
  ActionGroupId,
  ActionPolicyId,
  ActionPolicy,
  ActionPolicyWorkflowPayload,
} from '../types';
import { WorkflowsManagementApiToken } from './dispatch_step_tokens';

const ACTION_POLICY_TRIGGER = 'action_policy';
const MAX_CONCURRENT_DISPATCHES = 3;

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

    const limiter = pLimit(MAX_CONCURRENT_DISPATCHES);

    const groupResults = await Promise.allSettled(
      dispatch.map((group) => limiter(() => this.dispatchGroup(group, policies)))
    );

    const dispatchedExecutions = new Map<ActionGroupId, string[]>();
    for (const result of groupResults) {
      if (result.status !== 'fulfilled') continue;
      const { groupId, executionIds } = result.value;
      if (executionIds.length > 0) {
        dispatchedExecutions.set(groupId, executionIds);
      }
    }

    return { type: 'continue', data: { dispatchedExecutions } };
  }

  private async dispatchGroup(
    group: ActionGroup,
    policies?: Map<ActionPolicyId, ActionPolicy>
  ): Promise<{ groupId: ActionGroupId; executionIds: string[] }> {
    const executionIds: string[] = [];
    try {
      const policy = policies?.get(group.policyId);
      const apiKey = policy?.apiKey;

      if (!apiKey) {
        this.logger.warn({
          message: () =>
            `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`,
        });
        return { groupId: group.id, executionIds };
      }

      const fakeRequest = this.craftFakeRequest(apiKey);

      for (const destination of group.destinations) {
        if (destination.type !== 'workflow') {
          continue;
        }

        try {
          const executionId = await this.dispatchWorkflow(group, destination.id, fakeRequest);
          if (executionId) {
            executionIds.push(executionId);
          }
        } catch (err) {
          this.logger.error({
            error:
              err instanceof Error
                ? err
                : new Error(
                    `Failed to dispatch group ${group.id} to workflow ${destination.id}: ${String(
                      err
                    )}`
                  ),
          });
        }
      }
    } catch (err) {
      this.logger.error({
        error:
          err instanceof Error
            ? err
            : new Error(
                `Failed to dispatch group ${group.id} for policy ${group.policyId}: ${String(err)}`
              ),
      });
    }
    return { groupId: group.id, executionIds };
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
    group: ActionGroup,
    workflowId: string,
    request: KibanaRequest
  ): Promise<string | undefined> {
    const workflow = await this.workflowsManagement.getWorkflow(workflowId, group.spaceId);

    if (!workflow) {
      this.logger.warn({
        message: () => `Workflow ${workflowId} not found, skipping dispatch for group ${group.id}`,
      });
      return undefined;
    }

    if (!workflow.enabled) {
      this.logger.warn({
        message: () =>
          `Workflow ${workflowId} is disabled, enable it to dispatch for group ${group.id}`,
      });
      return undefined;
    }

    const model: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition ?? undefined,
      yaml: workflow.yaml,
    };

    const payload: ActionPolicyWorkflowPayload = {
      id: group.id,
      policyId: group.policyId,
      groupKey: group.groupKey,
      episodes: group.episodes,
    };

    this.logger.debug({
      message: () =>
        `Dispatching action group ${group.id} to workflow ${workflowId} for policy ${group.policyId}`,
    });

    const executionId = await this.workflowsManagement.scheduleWorkflow(
      model,
      group.spaceId,
      payload,
      request,
      ACTION_POLICY_TRIGGER
    );

    this.logger.debug({
      message: () =>
        `Workflow ${workflowId} execution scheduled with id ${executionId} for group ${group.id}`,
    });

    return executionId;
  }
}
