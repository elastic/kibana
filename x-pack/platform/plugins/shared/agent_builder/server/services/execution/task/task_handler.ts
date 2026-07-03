/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import { ExecutionStatus, isRequestAbortedError } from '@kbn/agent-builder-common';
import { createAgentExecutionClient, type AgentExecutionClient } from '../persistence';
import {
  handleAgentExecution,
  collectAndWriteEvents,
  serializeExecutionError,
  type AgentExecutionDeps,
} from '../execution_runner';
import { AbortMonitor } from './abort_monitor';
import {
  makeSuccessCallbackIfConfigured,
  makeFailureCallbackIfConfigured,
} from '../callback_delivery';

export interface TaskHandlerDeps extends AgentExecutionDeps {
  elasticsearch: ElasticsearchServiceStart;
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
      return;
    }

    // 2. Update status to running
    await executionClient.updateStatus(executionId, ExecutionStatus.running);

    // 3. Set up abort monitoring
    const abortMonitor = new AbortMonitor({
      executionId,
      executionClient,
      logger: this.logger.get('abort-monitor'),
    });
    abortMonitor.start();

    try {
      // 4. Build the event stream using the shared runner
      const events$ = await handleAgentExecution({
        deps: this.deps,
        request: fakeRequest,
        execution,
        abortSignal: abortMonitor.getSignal(),
      });

      // 5. Subscribe, collect, and write events to the execution document
      const events = await collectAndWriteEvents({
        events$,
        execution,
        executionClient,
        logger: this.logger,
      });

      // 6. Deliver success callback if configured
      await makeSuccessCallbackIfConfigured({
        callbackUrl: execution.metadata?.callback_url,
        executionId,
        events,
      });

      // 7. Mark as completed
      await executionClient.updateStatus(executionId, ExecutionStatus.completed);
    } catch (error) {
      await this.handleExecutionFailure({ executionId, execution, executionClient, error });
    } finally {
      abortMonitor.stop();
    }
  }

  private async handleExecutionFailure({
    executionId,
    execution,
    executionClient,
    error,
  }: {
    executionId: string;
    execution: NonNullable<Awaited<ReturnType<AgentExecutionClient['get']>>>;
    executionClient: AgentExecutionClient;
    error: unknown;
  }): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Execution ${executionId} failed: ${message}`);

    try {
      let serializedError = serializeExecutionError(error);
      let terminalStatus = isRequestAbortedError(error)
        ? ExecutionStatus.aborted
        : ExecutionStatus.failed;
      const conversationId =
        execution.executionMode === 'conversation'
          ? execution.agentParams.conversationId
          : undefined;
      try {
        await makeFailureCallbackIfConfigured({
          callbackUrl: execution.metadata?.callback_url,
          executionId,
          conversationId,
          error: serializedError,
          status: terminalStatus,
        });
      } catch (callbackError) {
        serializedError = serializeExecutionError(callbackError);
        terminalStatus = ExecutionStatus.failed;
      }
      if (terminalStatus === ExecutionStatus.aborted) {
        await executionClient.updateStatus(executionId, ExecutionStatus.aborted);
      } else {
        await executionClient.updateStatus(executionId, ExecutionStatus.failed, serializedError);
      }
    } catch (statusError) {
      this.logger.error(
        `Failed to update status for execution ${executionId}: ${statusError.message}`
      );
    }
  }

  async cancel({ executionId }: { executionId: string }): Promise<void> {
    const executionClient = this.createExecutionClient();
    await executionClient.updateStatus(executionId, ExecutionStatus.aborted);
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
