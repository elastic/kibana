/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  BulkScheduleWorkflowResult,
  WorkflowDetailDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import type {
  BulkScheduleWorkflowItem,
  WorkflowsServerPluginSetup,
} from '@kbn/workflows-management-plugin/server';
import { inject, injectable } from 'inversify';
import { isError } from 'lodash';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  ActionGroup,
  ActionGroupId,
  ActionPolicyWorkflowPayload,
  DispatchFailure,
} from '../types';
import { DISPATCH_CHUNK_SIZE } from '../constants';
import { DISPATCH_FAILURE_REASONS, type DispatchFailureReason } from './constants';
import { WorkflowsManagementApiToken } from './dispatch_step_tokens';

const ACTION_POLICY_TRIGGER = 'action_policy';

interface PendingSchedule {
  group: ActionGroup;
  workflowId: string;
  item: BulkScheduleWorkflowItem;
}

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
    const { signal } = state.input;

    const dispatchedExecutions = new Map<ActionGroupId, string[]>();
    const dispatchFailures: DispatchFailure[] = [];

    if (dispatch.length === 0 || signal.aborted) {
      return { type: 'continue', data: { dispatchedExecutions, dispatchFailures } };
    }

    const groupsByApiKey = new Map<string, ActionGroup[]>();
    for (const group of dispatch) {
      const apiKey = policies?.get(group.policyId)?.apiKey;
      if (!apiKey) {
        const message = `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`;
        this.logger.warn({
          message: () => message,
          code: ALERTING_LOG_CODES.DISPATCH_POLICY_MISSING_API_KEY,
          labels: { group_id: group.id, policy_id: group.policyId },
        });
        dispatchFailures.push(
          ...this.buildGroupFailures(group, DISPATCH_FAILURE_REASONS.MISSING_API_KEY, message)
        );
        continue;
      }
      const groups = groupsByApiKey.get(apiKey);
      if (groups) {
        groups.push(group);
      } else {
        groupsByApiKey.set(apiKey, [group]);
      }
    }

    const remainingGroups = [...groupsByApiKey.values()].flat();
    if (remainingGroups.length === 0) {
      return { type: 'continue', data: { dispatchedExecutions, dispatchFailures } };
    }

    const idsBySpace = new Map<string, Set<string>>();
    for (const group of remainingGroups) {
      for (const destination of group.destinations) {
        if (destination.type !== 'workflow') {
          continue;
        }
        const ids = idsBySpace.get(group.spaceId);
        if (ids) {
          ids.add(destination.id);
        } else {
          idsBySpace.set(group.spaceId, new Set([destination.id]));
        }
      }
    }

    const workflowsBySpace = new Map<string, Map<string, WorkflowDetailDto>>();
    const failedSpaces = new Map<string, Error>();
    for (const [spaceId, ids] of idsBySpace) {
      try {
        const workflows = await this.workflowsManagement.getWorkflowsByIds([...ids], spaceId);
        workflowsBySpace.set(
          spaceId,
          new Map(workflows.map((workflow) => [workflow.id, workflow]))
        );
      } catch (err) {
        failedSpaces.set(spaceId, isError(err) ? err : new Error(String(err)));
      }
    }

    for (const [apiKey, groups] of groupsByApiKey) {
      const pending: PendingSchedule[] = [];

      for (const group of groups) {
        const prefetchError = failedSpaces.get(group.spaceId);
        if (prefetchError) {
          this.recordPrefetchFailure(group, prefetchError, dispatchFailures);
          continue;
        }

        const workflows =
          workflowsBySpace.get(group.spaceId) ?? new Map<string, WorkflowDetailDto>();
        for (const destination of group.destinations) {
          if (destination.type !== 'workflow') {
            continue;
          }

          const workflow = workflows.get(destination.id);
          if (!workflow) {
            const message = `Workflow ${destination.id} not found, skipping dispatch for group ${group.id}`;
            this.logger.warn({
              message: () => message,
              code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
              labels: { group_id: group.id, workflow_id: destination.id },
            });
            dispatchFailures.push(
              this.buildFailure(
                group,
                destination.id,
                DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND,
                message
              )
            );
            continue;
          }

          if (!workflow.enabled) {
            const message = `Workflow ${destination.id} is disabled, enable it to dispatch for group ${group.id}`;
            this.logger.warn({
              message: () => message,
              code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_DISABLED,
              labels: { group_id: group.id, workflow_id: destination.id },
            });
            dispatchFailures.push(
              this.buildFailure(
                group,
                destination.id,
                DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED,
                message
              )
            );
            continue;
          }

          pending.push({
            group,
            workflowId: destination.id,
            item: this.buildScheduleItem(group, workflow),
          });
        }
      }

      const request = this.craftFakeRequest(apiKey);
      for (let offset = 0; offset < pending.length; offset += DISPATCH_CHUNK_SIZE) {
        if (signal.aborted) {
          break;
        }
        const chunk = pending.slice(offset, offset + DISPATCH_CHUNK_SIZE);
        await this.dispatchChunk(chunk, request, dispatchedExecutions, dispatchFailures);
      }
    }

    return { type: 'continue', data: { dispatchedExecutions, dispatchFailures } };
  }

  private recordPrefetchFailure(
    group: ActionGroup,
    error: Error,
    dispatchFailures: DispatchFailure[]
  ): void {
    for (const destination of group.destinations) {
      if (destination.type !== 'workflow') {
        continue;
      }
      this.logger.error({
        error,
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
        labels: {
          group_id: group.id,
          policy_id: group.policyId,
          workflow_id: destination.id,
        },
      });
      dispatchFailures.push(
        this.buildFailure(
          group,
          destination.id,
          DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
          error.message
        )
      );
    }
  }

  private buildScheduleItem(
    group: ActionGroup,
    workflow: WorkflowDetailDto
  ): BulkScheduleWorkflowItem {
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
    const inputs: Record<string, unknown> = { payload };

    return {
      workflow: model,
      spaceId: group.spaceId,
      inputs,
      triggeredBy: ACTION_POLICY_TRIGGER,
    };
  }

  private async dispatchChunk(
    chunk: PendingSchedule[],
    request: KibanaRequest,
    dispatchedExecutions: Map<ActionGroupId, string[]>,
    dispatchFailures: DispatchFailure[]
  ): Promise<void> {
    try {
      const results: BulkScheduleWorkflowResult =
        await this.workflowsManagement.bulkScheduleWorkflow(
          chunk.map((pending) => pending.item),
          request
        );
      for (let i = 0; i < chunk.length; i++) {
        this.applyScheduleResult(chunk[i], results[i], dispatchedExecutions, dispatchFailures);
      }
    } catch (err) {
      const error = isError(err) ? err : new Error(String(err));
      for (const pending of chunk) {
        this.logger.error({
          error,
          code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
          labels: {
            group_id: pending.group.id,
            policy_id: pending.group.policyId,
            workflow_id: pending.workflowId,
          },
        });
        dispatchFailures.push(
          this.buildFailure(
            pending.group,
            pending.workflowId,
            DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
            error.message
          )
        );
      }
    }
  }

  private applyScheduleResult(
    pending: PendingSchedule,
    result: BulkScheduleWorkflowResult[number] | undefined,
    dispatchedExecutions: Map<ActionGroupId, string[]>,
    dispatchFailures: DispatchFailure[]
  ): void {
    if (result?.status === 'scheduled' && result.workflowExecutionId) {
      const executionIds = dispatchedExecutions.get(pending.group.id);
      if (executionIds) {
        executionIds.push(result.workflowExecutionId);
      } else {
        dispatchedExecutions.set(pending.group.id, [result.workflowExecutionId]);
      }
      return;
    }

    if (result?.status === 'error') {
      const error = new Error(result.error.message);
      this.logger.error({
        error,
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
        labels: {
          group_id: pending.group.id,
          policy_id: pending.group.policyId,
          workflow_id: pending.workflowId,
        },
      });
      dispatchFailures.push(
        this.buildFailure(
          pending.group,
          pending.workflowId,
          DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
          result.error.message
        )
      );
      return;
    }

    const message = `Workflow ${pending.workflowId} scheduling returned no execution id for group ${pending.group.id}`;
    this.logger.warn({
      message: () => message,
      code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
      labels: { group_id: pending.group.id, workflow_id: pending.workflowId },
    });
    dispatchFailures.push(
      this.buildFailure(
        pending.group,
        pending.workflowId,
        DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
        message
      )
    );
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
}
