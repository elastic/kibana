/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentExecutionService, ExecuteAgentParams, FollowExecutionOptions } from './types';
import { ExecutionStatus } from './types';
import { taskTypes } from './task';
import {
  createAgentExecutionClient,
  createExecutionEventsClient,
  type AgentExecutionClient,
  type ExecutionEventsClient,
} from './persistence';

const FOLLOW_POLL_INTERVAL_MS = 500;

export interface AgentExecutionServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  dataStreams: DataStreamsStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

export const createAgentExecutionService = (
  deps: AgentExecutionServiceDeps
): AgentExecutionService => {
  return new AgentExecutionServiceImpl(deps);
};

class AgentExecutionServiceImpl implements AgentExecutionService {
  private readonly deps: AgentExecutionServiceDeps;
  private readonly logger: Logger;

  constructor(deps: AgentExecutionServiceDeps) {
    this.deps = deps;
    this.logger = deps.logger;
  }

  async executeAgent({ request, params }: ExecuteAgentParams): Promise<{ executionId: string }> {
    const executionId = uuidv4();
    const agentId = params.agentId ?? agentBuilderDefaultAgentId;
    const spaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });

    // 1. Create execution document
    const executionClient = this.createExecutionClient();
    await executionClient.create({
      executionId,
      agentId,
      spaceId,
      agentParams: params,
    });

    // 2. Schedule TM task
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

    this.logger.debug(`Scheduled agent execution ${executionId} for agent ${agentId}`);

    return { executionId };
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
    const eventsClient = this.createEventsClient();
    const executionClient = this.createExecutionClient();
    let lastEventNumber = options?.since ?? 0;

    return new Observable<ChatEvent>((observer) => {
      let stopped = false;

      const poll = async (): Promise<boolean> => {
        if (stopped) {
          return true; // signal done
        }

        try {
          // Read new events
          const events = await eventsClient.readEvents(executionId, lastEventNumber);

          for (const eventDoc of events) {
            observer.next(eventDoc.event);
            if (eventDoc.eventNumber > lastEventNumber) {
              lastEventNumber = eventDoc.eventNumber;
            }
          }

          // Check execution status
          const execution = await executionClient.get(executionId);
          if (!execution) {
            observer.error(new Error(`Execution ${executionId} not found`));
            return true;
          }

          const isTerminal =
            execution.status === ExecutionStatus.completed ||
            execution.status === ExecutionStatus.failed ||
            execution.status === ExecutionStatus.aborted;

          if (isTerminal) {
            // Do one final poll to make sure we got all events
            const finalEvents = await eventsClient.readEvents(executionId, lastEventNumber);
            for (const eventDoc of finalEvents) {
              observer.next(eventDoc.event);
            }
            return true; // done
          }

          return false; // keep polling
        } catch (err) {
          observer.error(err);
          return true;
        }
      };

      const runPollingLoop = async () => {
        let done = false;
        while (!done && !stopped) {
          done = await poll();
          if (!done) {
            await new Promise<void>((resolve) => setTimeout(resolve, FOLLOW_POLL_INTERVAL_MS));
          }
        }
        if (!stopped) {
          observer.complete();
        }
      };

      runPollingLoop().catch((err) => {
        if (!stopped) {
          observer.error(err);
        }
      });

      return () => {
        stopped = true;
      };
    });
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
