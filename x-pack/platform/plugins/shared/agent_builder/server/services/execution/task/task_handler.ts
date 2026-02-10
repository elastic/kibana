/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { ExecutionStatus } from '../types';
import {
  createAgentExecutionClient,
  createExecutionEventsClient,
  type AgentExecutionClient,
  type ExecutionEventsClient,
} from '../persistence';
import {
  buildAgentEventStream,
  collectAndWriteEvents,
  writeErrorEvent,
  type ExecutionRunnerDeps,
} from '../execution_runner';
import { AbortMonitor } from './abort_monitor';

export interface TaskHandlerDeps extends ExecutionRunnerDeps {
  elasticsearch: ElasticsearchServiceStart;
  dataStreams: DataStreamsStart;
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
    const eventsClient = this.createEventsClient();

    // 1. Load execution document
    const execution = await executionClient.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
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
      const events$ = await buildAgentEventStream({
        deps: this.deps,
        request: fakeRequest,
        execution,
        abortSignal: abortMonitor.getSignal(),
      });

      // 5. Subscribe, collect, and write events to ES
      await collectAndWriteEvents({
        events$,
        execution,
        eventsClient,
        logger: this.logger,
      });

      // 6. Mark as completed
      await executionClient.updateStatus(executionId, ExecutionStatus.completed);
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`);

      // Write an error event
      try {
        await writeErrorEvent({ execution, eventsClient, error });
      } catch (writeErr) {
        this.logger.error(
          `Failed to write error event for execution ${executionId}: ${writeErr.message}`
        );
      }

      // Update status to failed
      try {
        await executionClient.updateStatus(executionId, ExecutionStatus.failed);
      } catch (statusError) {
        this.logger.error(
          `Failed to update status for execution ${executionId}: ${statusError.message}`
        );
      }
    } finally {
      abortMonitor.stop();
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

  private createEventsClient(): ExecutionEventsClient {
    return createExecutionEventsClient({
      dataStreams: this.deps.dataStreams,
    });
  }
}
