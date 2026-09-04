/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
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
import { ALERTING_LOG_CODES, type AlertingV2LogCode } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { DISPATCH_CHUNK_SIZE } from '../constants';
import type {
  ActionGroup,
  ActionGroupId,
  ActionPolicyDestination,
  ActionPolicyWorkflowPayload,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  DispatchFailure,
} from '../types';
import { DispatchOutcome, DispatchPlan, PolicyCatalog } from '../state';
import { DISPATCH_FAILURE_REASONS, type DispatchFailureReason } from './constants';
import { WorkflowsManagementApiToken } from './dispatch_step_tokens';

const ACTION_POLICY_TRIGGER = 'action_policy';

interface PendingSchedule {
  group: ActionGroup;
  workflowId: string;
  item: BulkScheduleWorkflowItem;
}

const toError = (err: unknown): Error => (isError(err) ? err : new Error(String(err)));

const workflowDestinations = (group: ActionGroup): ActionPolicyDestination[] =>
  group.destinations.filter((destination) => destination.type === 'workflow');

const pushMapList = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
};

const addMapSet = <K, V>(map: Map<K, Set<V>>, key: K, value: V): void => {
  const set = map.get(key);
  if (set) {
    set.add(value);
  } else {
    map.set(key, new Set([value]));
  }
};

@injectable()
export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management']
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { plan = DispatchPlan.empty(), policies = PolicyCatalog.empty() } = state;
    const { signal } = state.input;

    const dispatchedExecutions = new Map<ActionGroupId, string[]>();
    const dispatchFailures: DispatchFailure[] = [];
    const done = (): DispatcherStepOutput => ({
      type: 'continue',
      data: {
        outcome: DispatchOutcome.of({
          executionsByGroup: dispatchedExecutions,
          failures: dispatchFailures,
        }),
      },
    });

    if (plan.toDispatch.length === 0 || signal.aborted) {
      return done();
    }

    const groupsByApiKey = new Map<string, ActionGroup[]>();
    for (const group of plan.toDispatch) {
      const apiKey = policies.apiKeyOf(group.policyId);
      if (!apiKey) {
        this.recordMissingApiKey(group, dispatchFailures, logger);
        continue;
      }
      pushMapList(groupsByApiKey, apiKey, group);
    }

    if (groupsByApiKey.size === 0) {
      return done();
    }

    const { workflowsBySpace, failedSpaces } = await this.prefetchWorkflows(
      [...groupsByApiKey.values()].flat()
    );

    for (const [apiKey, groups] of groupsByApiKey) {
      const pending = this.buildPendingSchedules(
        groups,
        workflowsBySpace,
        failedSpaces,
        dispatchFailures,
        logger
      );
      const request = this.craftFakeRequest(apiKey);
      for (let offset = 0; offset < pending.length; offset += DISPATCH_CHUNK_SIZE) {
        if (signal.aborted) {
          break;
        }
        await this.dispatchChunk(
          pending.slice(offset, offset + DISPATCH_CHUNK_SIZE),
          request,
          dispatchedExecutions,
          dispatchFailures,
          logger
        );
      }
    }

    return done();
  }

  private recordMissingApiKey(
    group: ActionGroup,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): void {
    const message = `No API key found for policy ${group.policyId}, skipping dispatch of group ${group.id}`;
    logger.warn({
      message: 'Action policy has no API key, skipping dispatch',
      code: ALERTING_LOG_CODES.DISPATCH_POLICY_MISSING_API_KEY,
      labels: { group_id: group.id, policy_id: group.policyId },
    });
    dispatchFailures.push(
      ...this.buildGroupFailures(group, DISPATCH_FAILURE_REASONS.MISSING_API_KEY, message)
    );
  }

  private async prefetchWorkflows(groups: ActionGroup[]): Promise<{
    workflowsBySpace: Map<string, Map<string, WorkflowDetailDto>>;
    failedSpaces: Map<string, Error>;
  }> {
    const idsBySpace = new Map<string, Set<string>>();
    for (const group of groups) {
      for (const destination of workflowDestinations(group)) {
        addMapSet(idsBySpace, group.spaceId, destination.id);
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
        failedSpaces.set(spaceId, toError(err));
      }
    }

    return { workflowsBySpace, failedSpaces };
  }

  private buildPendingSchedules(
    groups: ActionGroup[],
    workflowsBySpace: Map<string, Map<string, WorkflowDetailDto>>,
    failedSpaces: Map<string, Error>,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): PendingSchedule[] {
    const pending: PendingSchedule[] = [];

    for (const group of groups) {
      const prefetchError = failedSpaces.get(group.spaceId);
      if (prefetchError) {
        for (const destination of workflowDestinations(group)) {
          this.recordScheduleError(group, destination.id, prefetchError, dispatchFailures, logger);
        }
        continue;
      }

      const workflows = workflowsBySpace.get(group.spaceId) ?? new Map<string, WorkflowDetailDto>();
      for (const destination of workflowDestinations(group)) {
        const workflow = workflows.get(destination.id);
        if (!workflow) {
          this.recordWarnFailure(
            group,
            destination.id,
            DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND,
            ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
            'Workflow not found, skipping dispatch',
            `Workflow ${destination.id} not found, skipping dispatch for group ${group.id}`,
            dispatchFailures,
            logger
          );
          continue;
        }
        if (!workflow.enabled) {
          this.recordWarnFailure(
            group,
            destination.id,
            DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED,
            ALERTING_LOG_CODES.DISPATCH_WORKFLOW_DISABLED,
            'Workflow is disabled, skipping dispatch',
            `Workflow ${destination.id} is disabled, enable it to dispatch for group ${group.id}`,
            dispatchFailures,
            logger
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

    return pending;
  }

  private recordWarnFailure(
    group: ActionGroup,
    workflowId: string,
    reason: DispatchFailureReason,
    code: AlertingV2LogCode,
    logMessage: string,
    message: string,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): void {
    logger.warn({
      message: logMessage,
      code,
      labels: { group_id: group.id, workflow_id: workflowId },
    });
    dispatchFailures.push(this.buildFailure(group, workflowId, reason, message));
  }

  private recordScheduleError(
    group: ActionGroup,
    workflowId: string,
    error: Error,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): void {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
      labels: {
        group_id: group.id,
        policy_id: group.policyId,
        workflow_id: workflowId,
        space_id: group.spaceId,
      },
    });
    dispatchFailures.push(
      this.buildFailure(group, workflowId, DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR, error.message)
    );
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
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): Promise<void> {
    try {
      const results: BulkScheduleWorkflowResult =
        await this.workflowsManagement.bulkScheduleWorkflow(
          chunk.map((pending) => pending.item),
          request
        );
      for (let i = 0; i < chunk.length; i++) {
        this.applyScheduleResult(
          chunk[i],
          results[i],
          dispatchedExecutions,
          dispatchFailures,
          logger
        );
      }
    } catch (err) {
      const error = toError(err);
      for (const pending of chunk) {
        this.recordScheduleError(
          pending.group,
          pending.workflowId,
          error,
          dispatchFailures,
          logger
        );
      }
    }
  }

  private applyScheduleResult(
    pending: PendingSchedule,
    result: BulkScheduleWorkflowResult[number] | undefined,
    dispatchedExecutions: Map<ActionGroupId, string[]>,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): void {
    if (result?.status === 'scheduled' && result.workflowExecutionId) {
      pushMapList(dispatchedExecutions, pending.group.id, result.workflowExecutionId);
      return;
    }

    if (result?.status === 'error') {
      this.recordScheduleError(
        pending.group,
        pending.workflowId,
        new Error(result.error.message),
        dispatchFailures,
        logger
      );
      return;
    }

    this.recordWarnFailure(
      pending.group,
      pending.workflowId,
      DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
      'Workflow scheduling returned no execution id',
      `Workflow ${pending.workflowId} scheduling returned no execution id for group ${pending.group.id}`,
      dispatchFailures,
      logger
    );
  }

  private buildGroupFailures(
    group: ActionGroup,
    reason: DispatchFailureReason,
    message: string
  ): DispatchFailure[] {
    return workflowDestinations(group).map((destination) =>
      this.buildFailure(group, destination.id, reason, message)
    );
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
