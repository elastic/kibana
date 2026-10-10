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
  WorkflowsManagementClient,
} from '@kbn/workflows-management-plugin/server';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { inject, injectable } from 'inversify';
import { isError, uniqBy } from 'lodash';
import { ACTION_POLICIES_REQUIRED_LICENSE } from '../../../../common/action_policies_license';
import { getActionPolicyLicenseNotSupportedMessage } from '../../errors/action_policy_error_messages';
import { ALERTING_LOG_CODES, type AlertingV2LogCode } from '../../errors/error_codes';
import type {
  ActionPoliciesLicenseState,
  LicenseServiceContract,
} from '../../services/license_service/license_service';
import { LicenseServiceToken } from '../../services/license_service/tokens';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
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
import { toNotifiedActions } from './utils/action_documents';

const ACTION_POLICY_TRIGGER = 'action_policy';
const LOGGED_GROUP_ID_SAMPLE_SIZE = 10;

interface DispatchBatch {
  groups: ActionGroup[];
  request: KibanaRequest;
  workflowsBySpace: Map<string, Map<string, WorkflowDetailDto>>;
  failedSpaces: Map<string, Error>;
}

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

/**
 * Packs schedule items into chunks of at most `maxItems` without splitting a group: once a chunk
 * returns, every destination of its groups has been attempted. A group with more destinations than
 * `maxItems` gets a chunk of its own. Relies on a group's items being adjacent in `pending`.
 */
const chunkByGroup = (pending: PendingSchedule[], maxItems: number): PendingSchedule[][] => {
  const chunks: PendingSchedule[][] = [];
  let current: PendingSchedule[] = [];
  let start = 0;
  while (start < pending.length) {
    const groupId = pending[start].group.id;
    let end = start + 1;
    while (end < pending.length && pending[end].group.id === groupId) end++;
    const groupItems = pending.slice(start, end);
    if (current.length > 0 && current.length + groupItems.length > maxItems) {
      chunks.push(current);
      current = [];
    }
    current.push(...groupItems);
    start = end;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

@injectable()
export class DispatchStep implements DispatcherStep {
  public readonly name = 'dispatch';

  constructor(
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: WorkflowsServerPluginSetup['management'],
    @inject(LicenseServiceToken) private readonly licenseService: LicenseServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { plan = DispatchPlan.empty(), policies = PolicyCatalog.empty() } = state;
    const { signal } = state.input;

    const dispatchedExecutions = new Map<ActionGroupId, string[]>();
    const dispatchFailures: DispatchFailure[] = [];
    const committedGroupIds = new Set<ActionGroupId>();
    const done = (): DispatcherStepOutput => ({
      type: 'continue',
      data: {
        outcome: DispatchOutcome.of({
          executionsByGroup: dispatchedExecutions,
          failures: dispatchFailures,
          committedGroupIds,
        }),
      },
    });

    if (plan.toDispatch.length === 0 || signal.aborted) {
      return done();
    }

    const licenseState = await this.licenseService.getActionPoliciesLicenseState();
    if (!licenseState.isValid) {
      this.recordLicenseNotSupported(plan.toDispatch, licenseState, dispatchFailures, logger);
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

    const batches: DispatchBatch[] = [...groupsByApiKey].map(([apiKey, groups]) => ({
      groups,
      request: this.craftFakeRequest(apiKey),
      workflowsBySpace: new Map(),
      failedSpaces: new Map(),
    }));
    await this.prefetchWorkflows(batches);
    for (const { groups, request, workflowsBySpace, failedSpaces } of batches) {
      if (signal.aborted) break;
      const pending = this.buildPendingSchedules(
        groups,
        workflowsBySpace,
        failedSpaces,
        dispatchFailures,
        logger
      );
      for (const chunk of chunkByGroup(pending, DISPATCH_CHUNK_SIZE)) {
        if (signal.aborted) {
          break;
        }
        await this.dispatchChunk(
          chunk,
          this.workflowsManagement.getClient(request),
          dispatchedExecutions,
          dispatchFailures,
          logger
        );
        await this.commitNotified(chunk, dispatchedExecutions, policies, committedGroupIds, logger);
      }
    }

    return done();
  }

  /**
   * Records `notified` for the chunk's groups that got at least one scheduled execution, so a tick
   * that aborts before StoreActionsStep does not dispatch them again. Runs even when the signal
   * has fired: the workflows are already scheduled.
   */
  private async commitNotified(
    chunk: PendingSchedule[],
    dispatchedExecutions: Map<ActionGroupId, string[]>,
    policies: PolicyCatalog,
    committedGroupIds: Set<ActionGroupId>,
    logger: LoggerServiceContract
  ): Promise<void> {
    const groups = uniqBy(
      chunk.map(({ group }) => group),
      ({ id }) => id
    ).filter(({ id }) => dispatchedExecutions.has(id));
    if (groups.length === 0) {
      return;
    }

    try {
      const { errors } = await this.storageService.bulkIndexDocs({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs: groups.flatMap((group) =>
          toNotifiedActions(group, policies.groupingModeOf(group.policyId))
        ),
      });
      const rejectedGroupIds = new Set(errors.map(({ document }) => document.action_group_id));
      for (const { id } of groups) {
        if (!rejectedGroupIds.has(id)) committedGroupIds.add(id);
      }
      if (errors.length > 0) {
        this.logCommitFailure(
          groups.filter(({ id }) => rejectedGroupIds.has(id)),
          new Error(errors[0].message),
          logger
        );
      }
    } catch (err) {
      this.logCommitFailure(groups, toError(err), logger);
    }
  }

  private logCommitFailure(
    groups: readonly ActionGroup[],
    error: Error,
    logger: LoggerServiceContract
  ): void {
    const sample = groups.slice(0, LOGGED_GROUP_ID_SAMPLE_SIZE).map(({ id }) => id);
    const overflow = groups.length - sample.length;
    logger.error({
      error,
      code: ALERTING_LOG_CODES.DISPATCH_NOTIFIED_COMMIT_FAILED,
      message: () =>
        `Failed to record notified actions for ${groups.length} dispatched group(s) ` +
        `[${sample.join(', ')}${overflow > 0 ? `, and ${overflow} more` : ''}]; ` +
        `they are dispatched again if this tick aborts. ${error.message}`,
    });
  }

  private recordLicenseNotSupported(
    groups: readonly ActionGroup[],
    { type, status }: ActionPoliciesLicenseState,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): void {
    const message =
      `${getActionPolicyLicenseNotSupportedMessage(ACTION_POLICIES_REQUIRED_LICENSE)} ` +
      `(current: ${type ?? 'unknown'}, status: ${status ?? 'unknown'}); workflow not scheduled`;
    logger.warn({
      message: () => `${message} for ${groups.length} action group(s)`,
      code: ALERTING_LOG_CODES.DISPATCH_LICENSE_NOT_SUPPORTED,
    });
    for (const group of groups) {
      dispatchFailures.push(
        ...this.buildGroupFailures(group, DISPATCH_FAILURE_REASONS.LICENSE_NOT_SUPPORTED, message)
      );
    }
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

  private async prefetchWorkflows(batches: DispatchBatch[]): Promise<void> {
    const lookups: Array<{
      batch: DispatchBatch;
      ids: string[];
      spaceId: string;
      request: KibanaRequest;
    }> = [];
    for (const batch of batches) {
      const idsBySpace = new Map<string, Set<string>>();
      for (const group of batch.groups) {
        for (const destination of workflowDestinations(group)) {
          addMapSet(idsBySpace, group.spaceId, destination.id);
        }
      }
      for (const [spaceId, ids] of idsBySpace) {
        lookups.push({ batch, ids: [...ids], spaceId, request: batch.request });
      }
    }
    const results = await this.workflowsManagement.getWorkflowsByIdsForRequests(
      lookups.map(({ ids, spaceId, request }) => ({ ids, spaceId, request }))
    );
    results.forEach((result, index) => {
      const { batch, spaceId } = lookups[index];
      if (result.status === 'rejected') {
        batch.failedSpaces.set(spaceId, toError(result.reason));
      } else {
        batch.workflowsBySpace.set(
          spaceId,
          new Map(result.value.map((workflow) => [workflow.id, workflow]))
        );
      }
    });
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
      alerts: group.alerts,
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
    client: WorkflowsManagementClient,
    dispatchedExecutions: Map<ActionGroupId, string[]>,
    dispatchFailures: DispatchFailure[],
    logger: LoggerServiceContract
  ): Promise<void> {
    try {
      const results: BulkScheduleWorkflowResult = await client.bulkScheduleWorkflow(
        chunk.map((pending) => pending.item)
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
      alerts: group.alerts,
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
