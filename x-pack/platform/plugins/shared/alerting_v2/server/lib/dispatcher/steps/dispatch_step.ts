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
  DispatchFailure,
} from '../types';
import { DISPATCH_FAILURE_REASONS, type DispatchFailureReason } from './constants';
import { WorkflowsManagementApiToken } from './dispatch_step_tokens';

interface DispatchGroupResult {
  groupId: ActionGroupId;
  executionIds: string[];
  failures: DispatchFailure[];
}

type DispatchWorkflowResult =
  | { executionId: string }
  | { failure: { reason: DispatchFailureReason; message: string } };

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
    const dispatchFailures: DispatchFailure[] = [];
    for (const result of groupResults) {
      if (result.status !== 'fulfilled') continue;
      const { groupId, executionIds, failures } = result.value;
      if (executionIds.length > 0) {
        dispatchedExecutions.set(groupId, executionIds);
      }
      if (failures.length > 0) {
        dispatchFailures.push(...failures);
      }
    }

    return { type: 'continue', data: { dispatchedExecutions, dispatchFailures } };
  }

  private async dispatchGroup(
    group: ActionGroup,
    policies?: Map<ActionPolicyId, ActionPolicy>
  ): Promise<DispatchGroupResult> {
    const executionIds: string[] = [];
    const failures: DispatchFailure[] = [];
    try {
      const policy = policies?.get(group.policyId);
      const apiKey = policy?.apiKey;

      if (!apiKey) {
        const message = `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`;
        this.logger.warn({ message: () => message });
        failures.push(
          ...this.buildGroupFailures(group, DISPATCH_FAILURE_REASONS.MISSING_API_KEY, message)
        );
        return { groupId: group.id, executionIds, failures };
      }

      const fakeRequest = this.craftFakeRequest(apiKey);

      for (const destination of group.destinations) {
        if (destination.type !== 'workflow') {
          continue;
        }

        try {
          const result = await this.dispatchWorkflow(group, destination.id, fakeRequest);
          if ('executionId' in result) {
            executionIds.push(result.executionId);
          } else {
            failures.push(
              this.buildFailure(
                group,
                destination.id,
                result.failure.reason,
                result.failure.message
              )
            );
          }
        } catch (err) {
          const error =
            err instanceof Error
              ? err
              : new Error(
                  `Failed to dispatch group ${group.id} to workflow ${destination.id}: ${String(
                    err
                  )}`
                );
          this.logger.error({ error });
          failures.push(
            this.buildFailure(
              group,
              destination.id,
              DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
              error.message
            )
          );
        }
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(
              `Failed to dispatch group ${group.id} for policy ${group.policyId}: ${String(err)}`
            );
      this.logger.error({ error });
      // Reached only for failures raised before the per-destination loop (e.g.
      // request crafting). Nothing has been dispatched yet, so record one
      // failure per workflow destination.
      failures.push(
        ...this.buildGroupFailures(group, DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR, error.message)
      );
    }
    return { groupId: group.id, executionIds, failures };
  }

  private buildGroupFailures(
    group: ActionGroup,
    reason: DispatchFailureReason,
    message: string
  ): DispatchFailure[] {
    return group.destinations
      .filter((d) => d.type === 'workflow')
      .map((d) => this.buildFailure(group, d.id, reason, message));
  }

  private buildFailure(
    group: ActionGroup,
    workflowId: string,
    reason: DispatchFailureReason,
    message: string
  ): DispatchFailure {
    return {
      policyId: group.policyId,
      spaceId: group.spaceId,
      actionGroupId: group.id,
      workflowId,
      episodes: group.episodes,
      reason,
      message,
    };
  }

  private craftFakeRequest(apiKey: string): KibanaRequest {
    const requestHeaders: Headers = {
      authorization: `ApiKey ${apiKey}`,
    };

    const fakeRawRequest: FakeRawRequest = {
      headers: requestHeaders,
    };

    return kibanaRequestFactory(fakeRawRequest);
  }

  private async dispatchWorkflow(
    group: ActionGroup,
    workflowId: string,
    request: KibanaRequest
  ): Promise<DispatchWorkflowResult> {
    const workflow = await this.workflowsManagement.getWorkflow(workflowId, group.spaceId);

    if (!workflow) {
      const message = `Workflow ${workflowId} not found, skipping dispatch for group ${group.id}`;
      this.logger.warn({ message: () => message });
      return { failure: { reason: DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND, message } };
    }

    if (!workflow.enabled) {
      const message = `Workflow ${workflowId} is disabled, enable it to dispatch for group ${group.id}`;
      this.logger.warn({ message: () => message });
      return { failure: { reason: DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED, message } };
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
      rules: group.rules,
    };

    this.logger.debug({
      message: () =>
        `Dispatching action group ${group.id} to workflow ${workflowId} for policy ${group.policyId}`,
    });

    const executionId = await this.workflowsManagement.scheduleWorkflow(
      model,
      group.spaceId,
      { payload },
      request,
      ACTION_POLICY_TRIGGER
    );

    if (!executionId) {
      const message = `Workflow ${workflowId} scheduling returned no execution id for group ${group.id}`;
      this.logger.warn({ message: () => message });
      return { failure: { reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR, message } };
    }

    this.logger.debug({
      message: () =>
        `Workflow ${workflowId} execution scheduled with id ${executionId} for group ${group.id}`,
    });

    return { executionId };
  }
}
