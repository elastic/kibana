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
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import {
  AgentExecutionMode,
  ExecutionStatus,
  isConversationBusyError,
  isConversationWriteConflictError,
  isRequestAbortedError,
} from '@kbn/agent-builder-common';
import { createAgentExecutionClient, type AgentExecutionClient } from '../persistence';
import { findQueuedExecutions, hasExecutionQueuedAhead } from '../conversation_turn';
import { toRunAgentTaskId } from './task_definitions';
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
  taskManager: TaskManagerStartContract;
}

export interface TaskHandlerRunResult {
  /** Another execution has the conversation's turn: the task checks again later. */
  waiting: boolean;
}

/**
 * The task handler interface used by the task definition.
 */
export interface TaskHandler {
  run(params: { executionId: string; fakeRequest: KibanaRequest }): Promise<TaskHandlerRunResult>;
  cancel(params: { executionId: string }): Promise<void>;
}

/** The conversation a stored conversation execution takes turns on, and who it runs as. */
interface ConversationTurn {
  conversationId: string;
  owner: UserIdAndName;
}

const getConversationTurn = ({
  executionMode,
  agentParams,
  owner,
}: AgentExecution): ConversationTurn | undefined => {
  if (executionMode !== AgentExecutionMode.conversation || !owner) {
    return undefined;
  }

  const { conversationId, storeConversation } = agentParams;

  return conversationId && storeConversation !== false ? { conversationId, owner } : undefined;
};

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
  }): Promise<TaskHandlerRunResult> {
    const executionClient = this.createExecutionClient();

    // 1. Load execution document
    const execution = await executionClient.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const turn = getConversationTurn(execution);
    const abortedBeforeStart = execution.status === ExecutionStatus.aborted;

    if (abortedBeforeStart && !turn) {
      this.logger.info(`Execution ${executionId} was aborted before it started; skipping`);
      return { waiting: false };
    }

    // 2. Wait for the conversation's turn, then update status to running. An execution aborted
    // while it waited still runs, with its signal already aborted, so the runner records the
    // interruption next to its user message.
    if (!abortedBeforeStart) {
      if (turn) {
        try {
          const hasTurn = await this.takeTurn({
            execution,
            turn,
            executionClient,
            fakeRequest,
          });

          if (!hasTurn) {
            await executionClient.updateHeartbeat(executionId);
            return { waiting: true };
          }
        } catch (error) {
          await this.handleExecutionFailure({ execution, executionClient, error });
          return { waiting: false };
        }
      }

      await executionClient.updateStatus(executionId, ExecutionStatus.running);
    }

    // 3. Set up abort monitoring and heartbeat reporting
    const abortMonitor = new AbortMonitor({
      executionId,
      executionClient,
      logger: this.logger.get('abort-monitor'),
    });

    const heartbeatReporter = new HeartbeatReporter({
      executionId,
      executionClient,
      logger: this.logger.get('heartbeat-reporter'),
    });

    if (!abortedBeforeStart) {
      abortMonitor.start();
      heartbeatReporter.start();
    }

    const abortSignal = abortedBeforeStart
      ? AbortSignal.abort(execution.abortReason)
      : abortMonitor.getSignal();

    // 4. Build a single multicast event stream; wrapping the async setup makes setup
    // errors surface as stream errors too.
    const events$ = connectable(
      from(
        handleAgentExecution({
          deps: this.deps,
          request: fakeRequest,
          execution,
          abortSignal,
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

    // 7. The run released the conversation: start the next execution waiting on it now, rather
    // than at its next check.
    if (turn) {
      await this.startNextQueuedExecution({
        executionId,
        conversationId: turn.conversationId,
        executionClient,
      });
    }

    return { waiting: false };
  }

  /** True when no older execution waits on the conversation and this one now holds it. */
  private async takeTurn({
    execution,
    turn: { conversationId, owner },
    executionClient,
    fakeRequest,
  }: {
    execution: AgentExecution;
    turn: ConversationTurn;
    executionClient: AgentExecutionClient;
    fakeRequest: KibanaRequest;
  }): Promise<boolean> {
    const { executionId } = execution;

    if (await hasExecutionQueuedAhead({ executionClient, conversationId, execution })) {
      return false;
    }

    const conversationClient = await this.deps.conversationService.getScopedClientAsUser({
      request: fakeRequest,
      user: { ...owner, isAdmin: false },
    });

    try {
      await conversationClient.update(
        { id: conversationId },
        {
          source: 'execution',
          access: 'converse',
          retryOnConflict: true,
          activeExecution: { action: 'acquire', executionId },
        }
      );

      return true;
    } catch (error) {
      if (isConversationBusyError(error) || isConversationWriteConflictError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async startNextQueuedExecution({
    executionId,
    conversationId,
    executionClient,
  }: {
    executionId: string;
    conversationId: string;
    executionClient: AgentExecutionClient;
  }): Promise<void> {
    try {
      const queued = await findQueuedExecutions({ executionClient, conversationId });
      const next = queued.find((execution) => execution.executionId !== executionId);

      if (!next) {
        return;
      }

      await this.deps.taskManager.runSoon(toRunAgentTaskId(next.executionId), {
        requestImmediateClaim: true,
      });
    } catch (error) {
      // The next execution still starts at its own next check.
      this.logger.debug(
        `Could not start the next execution on conversation ${conversationId}: ${error.message}`
      );
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
