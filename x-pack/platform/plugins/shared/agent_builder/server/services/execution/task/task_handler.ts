/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectable, from, switchMap } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import {
  AgentExecutionMode,
  ExecutionStatus,
  isRequestAbortedError,
} from '@kbn/agent-builder-common';
import { createAgentExecutionClient, type AgentExecutionClient } from '../persistence';
import {
  handleAgentExecution,
  collectAndWriteEvents,
  type AgentExecutionDeps,
} from '../execution_runner';
import { serializeExecutionError } from '../utils/serialize_execution_error';
import { AbortMonitor } from './abort_monitor';
import { HeartbeatReporter } from './heartbeat_reporter';
import type { SurfacesService } from '../../surfaces';
import { deliverCallbackEvents, type CallbackDeliveryService } from '../callback';

export interface TaskHandlerDeps extends AgentExecutionDeps {
  elasticsearch: ElasticsearchServiceStart;
  callbackDeliveryService: CallbackDeliveryService;
  surfacesService: SurfacesService;
}

/**
 * The task handler interface used by the task definition.
 */
export interface TaskHandler {
  run(params: { executionId: string; fakeRequest: KibanaRequest }): Promise<void>;
  cancel(params: { executionId: string }): Promise<void>;
}

export const createTaskHandler = (deps: TaskHandlerDeps): TaskHandler => {
  return new TaskHandlerImpl(deps);
};

class TaskHandlerImpl implements TaskHandler {
  private readonly deps: TaskHandlerDeps;
  private readonly logger: Logger;

  constructor(deps: TaskHandlerDeps) {
    this.deps = deps;
    this.logger = deps.logger;
  }

  async run({
    executionId,
    fakeRequest,
  }: {
    executionId: string;
    fakeRequest: KibanaRequest;
  }): Promise<void> {
    const executionClient = this.createExecutionClient();

    // 1. Load execution document
    const execution = await executionClient.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === ExecutionStatus.aborted) {
      this.logger.info(`Execution ${executionId} was aborted before it started; skipping`);
      await this.releaseActiveExecution({ execution, fakeRequest });
      return;
    }

    // 2. Update status to running
    await executionClient.updateStatus(executionId, ExecutionStatus.running);

    // 3. Set up abort monitoring and heartbeat reporting
    const abortMonitor = new AbortMonitor({
      executionId,
      executionClient,
      logger: this.logger.get('abort-monitor'),
    });
    abortMonitor.start();

    const heartbeatReporter = new HeartbeatReporter({
      executionId,
      executionClient,
      logger: this.logger.get('heartbeat-reporter'),
    });
    heartbeatReporter.start();

    // 4. Build a single multicast event stream; wrapping the async setup makes setup
    // errors surface as stream errors too.
    const events$ = connectable(
      from(
        handleAgentExecution({
          deps: this.deps,
          request: fakeRequest,
          execution,
          abortSignal: abortMonitor.getSignal(),
        })
      ).pipe(switchMap((agentEvents$) => agentEvents$))
    );

    // 5. Attach both consumers before connecting, so neither misses events.
    const callbackDeliveryPromise = deliverCallbackEvents({
      execution,
      events$,
      request: fakeRequest,
      callbackDeliveryService: this.deps.callbackDeliveryService,
      surfacesService: this.deps.surfacesService,
      logger: this.logger,
    });

    const persistencePromise = collectAndWriteEvents({
      events$,
      execution,
      executionClient,
      logger: this.logger,
    });

    events$.connect();

    try {
      await persistencePromise;

      // 6. Drain callback delivery, then mark as completed
      await callbackDeliveryPromise;
      await executionClient.updateStatus(executionId, ExecutionStatus.completed);
    } catch (error) {
      await callbackDeliveryPromise;
      await this.handleExecutionFailure({ execution, executionClient, error });
    } finally {
      abortMonitor.stop();
      heartbeatReporter.stop();
    }
  }

  /** Records the execution's failed or aborted status. */
  private async handleExecutionFailure({
    execution,
    executionClient,
    error,
  }: {
    execution: AgentExecution;
    executionClient: AgentExecutionClient;
    error?: unknown;
  }): Promise<void> {
    const { executionId } = execution;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Execution ${executionId} failed: ${message}`);

    try {
      const serializedError = error ? serializeExecutionError(error) : undefined;

      const status = isRequestAbortedError(error)
        ? ExecutionStatus.aborted
        : ExecutionStatus.failed;

      await executionClient.updateStatus(executionId, status, { error: serializedError });
    } catch (statusError) {
      this.logger.error(
        `Failed to update status for execution ${executionId}: ${statusError.message}`
      );
    }
  }

  /**
   * Releases the conversation an execution aborted before it started still holds: its run never
   * reaches a terminal write, which is where a run releases it.
   */
  private async releaseActiveExecution({
    execution,
    fakeRequest,
  }: {
    execution: AgentExecution;
    fakeRequest: KibanaRequest;
  }): Promise<void> {
    const { executionId, executionMode, agentParams, owner } = execution;

    if (executionMode !== AgentExecutionMode.conversation || !owner) {
      return;
    }

    const { conversationId, storeConversation } = agentParams;

    if (!conversationId || storeConversation === false) {
      return;
    }

    try {
      const conversationClient = await this.deps.conversationService.getScopedClientAsUser({
        request: fakeRequest,
        user: { ...owner, isAdmin: false },
      });

      await conversationClient.update(
        { id: conversationId },
        {
          source: 'execution',
          access: 'converse',
          retryOnConflict: true,
          activeExecution: { releaseExecutionId: executionId },
        }
      );
    } catch (error) {
      this.logger.warn(
        `Failed to release conversation ${conversationId} after execution ${executionId} was aborted before it started: ${error.message}`
      );
    }
  }

  /** Task Manager cancelled the task (timeout or Kibana shutdown). */
  async cancel({ executionId }: { executionId: string }): Promise<void> {
    const executionClient = this.createExecutionClient();
    await executionClient.updateStatus(executionId, ExecutionStatus.aborted, {
      abortReason: { source: 'task_manager' },
    });
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
