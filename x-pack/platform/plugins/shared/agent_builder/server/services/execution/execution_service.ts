/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { shareReplay } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getCurrentSpaceId } from '../../utils/spaces';
import type {
  AgentExecutionService,
  AgentExecution,
  ExecuteAgentParams,
  ExecuteAgentResult,
  FollowExecutionOptions,
} from './types';
import { ExecutionStatus } from './types';
import { taskTypes } from './task';
import { createAgentExecutionClient, type AgentExecutionClient } from './persistence';
import {
  handleAgentExecution,
  collectAndWriteEvents,
  serializeExecutionError,
  type AgentExecutionDeps,
} from './execution_runner';
import { AbortMonitor } from './task/abort_monitor';
import { followExecution$ } from './execution_follower';

export interface AgentExecutionServiceDeps extends AgentExecutionDeps {
  elasticsearch: ElasticsearchServiceStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

export const createAgentExecutionService = (
  deps: AgentExecutionServiceDeps
): AgentExecutionService => {
  return new AgentExecutionServiceImpl(deps);
};

const noop = () => {};

class AgentExecutionServiceImpl implements AgentExecutionService {
  private readonly deps: AgentExecutionServiceDeps;
  private readonly logger: Logger;

  constructor(deps: AgentExecutionServiceDeps) {
    this.deps = deps;
    this.logger = deps.logger;
  }

  async executeAgent({
    request,
    params,
    useTaskManager,
    abortSignal,
  }: ExecuteAgentParams): Promise<ExecuteAgentResult> {
    const executionId = uuidv4();
    const agentId = params.agentId ?? agentBuilderDefaultAgentId;
    const spaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });

    const executionClient = this.createExecutionClient();
    const execution = await executionClient.create({
      executionId,
      agentId,
      spaceId,
      agentParams: params,
    });

    // Wire up external abort signal to execution abort
    if (abortSignal) {
      const onAbort = () => {
        this.abortExecution(executionId).catch(noop);
      };
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    const runOnTaskManager = await this.shouldUseTaskManager(request, useTaskManager);
    if (runOnTaskManager) {
      return this.executeRemote({ executionId, agentId, request });
    } else {
      return this.executeLocally({ execution, request });
    }
  }

  async abortExecution(executionId: string): Promise<void> {
    const executionClient = this.createExecutionClient();
    const execution = await executionClient.get(executionId);

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (
      execution.status !== ExecutionStatus.scheduled &&
      execution.status !== ExecutionStatus.running
    ) {
      throw new Error(`Cannot abort execution ${executionId} with status ${execution.status}`);
    }

    await executionClient.updateStatus(executionId, ExecutionStatus.aborted);
    this.logger.debug(`Aborted execution ${executionId}`);
  }

  followExecution(executionId: string, options?: FollowExecutionOptions): Observable<ChatEvent> {
    return followExecution$({
      executionId,
      executionClient: this.createExecutionClient(),
      since: options?.since,
    });
  }

  /**
   * Execute on a TM node: schedule the task and return the followExecution polling observable.
   */
  private async executeRemote({
    executionId,
    agentId,
    request,
  }: {
    executionId: string;
    agentId: string;
    request: ExecuteAgentParams['request'];
  }): Promise<ExecuteAgentResult> {
    await this.deps.taskManager.schedule(
      {
        id: `agent-${executionId}`,
        taskType: taskTypes.runAgent,
        params: { executionId },
        scope: ['agent-builder'],
        enabled: true,
        state: {},
      },
      { request }
    );

    this.logger.debug(`Scheduled remote agent execution ${executionId} for agent ${agentId}`);

    return {
      executionId,
      events$: this.followExecution(executionId),
    };
  }

  /**
   * Execute on the current node: build the event stream, multicast it,
   * and set up a side-effect subscription that writes events to ES and updates status.
   */
  private async executeLocally({
    execution,
    request,
  }: {
    execution: AgentExecution;
    request: ExecuteAgentParams['request'];
  }): Promise<ExecuteAgentResult> {
    const { executionId } = execution;
    const executionClient = this.createExecutionClient();

    // Update status to running
    await executionClient.updateStatus(executionId, ExecutionStatus.running);

    // Set up abort monitoring (same mechanism as TM path)
    const abortMonitor = new AbortMonitor({
      executionId,
      executionClient,
      logger: this.logger.get('abort-monitor'),
    });
    abortMonitor.start();

    try {
      // Build the live event stream
      const rawEvents$ = await handleAgentExecution({
        deps: this.deps,
        request,
        execution,
        abortSignal: abortMonitor.getSignal(),
      });

      // Multicast the stream so multiple subscribers share the same source
      const events$ = rawEvents$.pipe(shareReplay());

      // Side-effect subscription: write events to ES and update execution status.
      // The abortMonitor is stopped in the .finally() of this subscription.
      this.subscribeForPersistence({
        events$,
        execution,
        executionClient,
        abortMonitor,
      });

      this.logger.debug(
        `Started local agent execution ${executionId} for agent ${execution.agentId}`
      );

      return {
        executionId,
        events$,
      };
    } catch (e) {
      abortMonitor.stop();
      throw e;
    }
  }

  /**
   * Subscribe to the events observable to persist events to ES and update execution status.
   * This runs in the background - errors are logged but don't affect the live observable.
   */
  private subscribeForPersistence({
    events$,
    execution,
    executionClient,
    abortMonitor,
  }: {
    events$: Observable<ChatEvent>;
    execution: AgentExecution;
    executionClient: AgentExecutionClient;
    abortMonitor: AbortMonitor;
  }): void {
    const { executionId } = execution;

    collectAndWriteEvents({
      events$,
      execution,
      executionClient,
      logger: this.logger,
    })
      .then(async () => {
        await executionClient.updateStatus(executionId, ExecutionStatus.completed);
        this.logger.debug(`Local execution ${executionId} completed`);
      })
      .catch(async (error) => {
        this.logger.error(`Local execution ${executionId} failed: ${error.message}`);

        try {
          await executionClient.updateStatus(
            executionId,
            ExecutionStatus.failed,
            serializeExecutionError(error)
          );
        } catch (statusErr) {
          this.logger.error(
            `Failed to update status for local execution ${executionId}: ${statusErr.message}`
          );
        }
      })
      .finally(() => {
        abortMonitor.stop();
      });
  }

  /**
   * Determine whether execution should run on a Task Manager node.
   *
   * 1. If `useTaskManager` is explicitly provided, honour it.
   * 2. If the request is a fakeRequest (already running on TM), run locally.
   * 3. Otherwise, read the experimental-features UI setting.
   */
  private async shouldUseTaskManager(
    request: KibanaRequest,
    useTaskManager?: boolean
  ): Promise<boolean> {
    if (useTaskManager !== undefined) {
      return useTaskManager;
    }
    if (request.isFakeRequest) {
      return false;
    }
    const soClient = this.deps.savedObjects.getScopedClient(request);
    const uiSettingsClient = this.deps.uiSettings.asScopedToClient(soClient);
    return uiSettingsClient.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
