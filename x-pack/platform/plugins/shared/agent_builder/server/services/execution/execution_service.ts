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
import type {
  ChatEvent,
  ExecutionAbortReason,
  InteractivityConfig,
} from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  isExecutionAbortReason,
  isRequestAbortedError,
  normalizeInteractive,
} from '@kbn/agent-builder-common';
import type {
  AbortExecutionOptions,
  AbortExecutionResult,
  AgentExecutionService,
  AgentExecution,
  ExecuteAgentParams,
  ExecuteAgentResult,
  FollowExecutionOptions,
  FindExecutionsOptions,
} from '@kbn/agent-builder-server/execution';
import { ExecutionStatus, isExecutionTerminalEvent } from '@kbn/agent-builder-common';
import { ABORT_WAIT_FOR_TERMINAL_TIMEOUT_MS, FOLLOW_POLL_INTERVAL_MS } from './constants';
import { getCurrentSpaceId } from '../../utils/spaces';
import { isVersionConflictError } from '../../utils/is_version_conflict_error';
import type { AttachmentServiceStart } from '../attachments';
import { taskTypes } from './task';
import { createAgentExecutionClient, type AgentExecutionClient } from './persistence';
import {
  handleAgentExecution,
  collectAndWriteEvents,
  type AgentExecutionDeps,
} from './execution_runner';
import { serializeExecutionError } from './utils';
import { AbortMonitor } from './task/abort_monitor';
import { HeartbeatReporter } from './task/heartbeat_reporter';
import { followExecution$ } from './execution_follower';

export interface AgentExecutionServiceDeps extends AgentExecutionDeps {
  elasticsearch: ElasticsearchServiceStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  attachmentsService: AttachmentServiceStart;
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
    mode,
    params,
    executionId: providedExecutionId,
    useTaskManager,
    abortSignal,
    metadata,
    interactive,
  }: ExecuteAgentParams): Promise<ExecuteAgentResult> {
    const executionId = providedExecutionId ?? uuidv4();
    const agentId = params.agentId ?? agentBuilderDefaultAgentId;
    const spaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });
    const interactivity = normalizeInteractive(interactive, mode);

    const executionClient = this.createExecutionClient();

    const validatedAttachments = await this.deps.attachmentsService.validateAttachmentInputs(
      params.nextInput.attachments,
      request
    );
    const validatedParams = validatedAttachments
      ? {
          ...params,
          nextInput: {
            ...params.nextInput,
            attachments: validatedAttachments,
          },
        }
      : params;

    let execution: AgentExecution;
    try {
      execution = await executionClient.create({
        executionMode: mode,
        executionId,
        agentId,
        spaceId,
        agentParams: validatedParams,
        parentExecutionId: params.parentExecutionId,
        metadata,
        interactivity,
      });
    } catch (err) {
      if (isVersionConflictError(err)) {
        if (metadata?.execution_idempotency_key) {
          this.logger.debug(
            `Duplicate idempotency key detected, returning existing execution ${executionId}`
          );

          // Repairs executions left in `scheduled` when the original delivery
          // failed before scheduling the task.
          const existing = await executionClient.peek(executionId);

          if (existing?.status === ExecutionStatus.scheduled) {
            await this.deps.taskManager.ensureScheduled(this.buildRunAgentTask(executionId), {
              request,
              cloneApiKey: true,
            });
          }

          return {
            executionId,
            events$: this.followExecution(executionId),
          };
        }

        throw createBadRequestError(`Execution with id ${executionId} already exists`);
      }

      throw err;
    }

    // Wire up external abort signal to execution abort. A cascaded abort keeps the original
    // actor (a user aborting the parent execution) so the child records who asked.
    if (abortSignal) {
      const onAbort = () => {
        const cause = isExecutionAbortReason(abortSignal.reason) ? abortSignal.reason : undefined;
        const reason: ExecutionAbortReason = {
          source: 'caller',
          ...(params.parentExecutionId ? { parent_execution_id: params.parentExecutionId } : {}),
          ...(cause?.actor ? { actor: cause.actor } : {}),
        };
        // fire and forget: the caller is winding down itself, nothing waits on the record
        this.abortExecution(executionId, { reason, waitForTerminal: false }).catch(noop);
      };
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    const useScheduledTask = await this.shouldUseScheduledTask(request, useTaskManager);
    if (useScheduledTask) {
      return this.executeWithScheduledTask({ executionId, agentId, request });
    } else {
      return this.executeLocally({ execution, request, interactivity });
    }
  }

  async getExecution(executionId: string): Promise<AgentExecution | undefined> {
    const executionClient = this.createExecutionClient();
    return executionClient.get(executionId);
  }

  async abortExecution(
    executionId: string,
    { reason = { source: 'api' }, waitForTerminal = true }: AbortExecutionOptions = {}
  ): Promise<AbortExecutionResult> {
    const executionClient = this.createExecutionClient();
    const execution = await executionClient.get(executionId);

    if (!execution) {
      this.logger.warn(`Ignoring abort for unknown execution ${executionId}`);
      return { acknowledged: false, terminalPersisted: false };
    }

    if (
      execution.status !== ExecutionStatus.scheduled &&
      execution.status !== ExecutionStatus.running
    ) {
      this.logger.debug(
        `Ignoring abort for execution ${executionId} with terminal status ${execution.status}`
      );
      return { acknowledged: false, terminalPersisted: false };
    }

    await executionClient.updateStatus(executionId, ExecutionStatus.aborted, {
      abortReason: reason,
    });
    this.logger.debug(`Aborted execution ${executionId} (${reason.source})`);

    // A scheduled execution never starts (the task handler sees `aborted` and skips it), so there
    // is no record to wait for. A running one is wound down by the executing node, which writes
    // the interruption to the conversation and then flushes the terminal event to the execution
    // document: that flush is the signal the record has landed.
    if (!waitForTerminal || execution.status !== ExecutionStatus.running) {
      return { acknowledged: true, terminalPersisted: false };
    }
    const terminalPersisted = await this.waitForTerminalEvent({
      executionClient,
      executionId,
      since: execution.eventCount,
    });
    if (!terminalPersisted) {
      this.logger.warn(
        `Execution ${executionId} did not record its interruption within ${ABORT_WAIT_FOR_TERMINAL_TIMEOUT_MS}ms of the abort`
      );
    }
    return { acknowledged: true, terminalPersisted };
  }

  /** Polls the execution document until a terminal timeline event lands or the bound elapses. */
  private async waitForTerminalEvent({
    executionClient,
    executionId,
    since,
  }: {
    executionClient: AgentExecutionClient;
    executionId: string;
    since: number;
  }): Promise<boolean> {
    const deadline = Date.now() + ABORT_WAIT_FOR_TERMINAL_TIMEOUT_MS;
    let lastEventIndex = since;
    while (true) {
      const peek = await executionClient.peek(executionId);
      if (peek && peek.eventCount > lastEventIndex) {
        const { events } = await executionClient.readEvents(executionId, lastEventIndex);
        lastEventIndex += events.length;
        if (events.some(isExecutionTerminalEvent)) {
          return true;
        }
      }
      if (Date.now() >= deadline) {
        return false;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, FOLLOW_POLL_INTERVAL_MS));
    }
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
  private buildRunAgentTask(executionId: string) {
    return {
      id: `agent-${executionId}`,
      taskType: taskTypes.runAgent,
      params: { executionId },
      scope: ['agent-builder'],
      enabled: true,
      state: {},
    };
  }

  private async executeWithScheduledTask({
    executionId,
    agentId,
    request,
  }: {
    executionId: string;
    agentId: string;
    request: ExecuteAgentParams['request'];
  }): Promise<ExecuteAgentResult> {
    // ensureScheduled tolerates the task already existing: a concurrent idempotent
    // replay may have re-issued this schedule while repairing a stuck execution.
    await this.deps.taskManager.ensureScheduled(this.buildRunAgentTask(executionId), {
      request,
      cloneApiKey: true,
    });

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
    interactivity,
  }: {
    execution: AgentExecution;
    request: ExecuteAgentParams['request'];
    interactivity: InteractivityConfig;
  }): Promise<ExecuteAgentResult> {
    const { executionId } = execution;
    const executionClient = this.createExecutionClient();

    // Update status to running
    await executionClient.updateStatus(executionId, ExecutionStatus.running);

    // Set up abort monitoring and heartbeat reporting (same mechanism as TM path)
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

    try {
      // Build the live event stream
      const rawEvents$ = await handleAgentExecution({
        deps: this.deps,
        request,
        execution,
        interactivity,
        abortSignal: abortMonitor.getSignal(),
      });

      // Multicast the stream so multiple subscribers share the same source
      const events$ = rawEvents$.pipe(shareReplay());

      // Side-effect subscription: write events to ES and update execution status.
      // The abortMonitor and heartbeatReporter are stopped in the .finally() of this subscription.
      this.subscribeForPersistence({
        events$,
        execution,
        executionClient,
        abortMonitor,
        heartbeatReporter,
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
      heartbeatReporter.stop();
      // The stream never existed, so the stream-based status writers never ran: record the
      // terminal status here instead of leaving the document `running` forever.
      const status = isRequestAbortedError(e) ? ExecutionStatus.aborted : ExecutionStatus.failed;
      try {
        await executionClient.updateStatus(executionId, status, {
          error: serializeExecutionError(e),
        });
      } catch (statusErr) {
        this.logger.error(
          `Failed to update status for local execution ${executionId}: ${statusErr.message}`
        );
      }
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
    heartbeatReporter,
  }: {
    events$: Observable<ChatEvent>;
    execution: AgentExecution;
    executionClient: AgentExecutionClient;
    abortMonitor: AbortMonitor;
    heartbeatReporter: HeartbeatReporter;
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

        // Same classification as the Task Manager handler: an abort is recorded as `aborted`.
        const status = isRequestAbortedError(error)
          ? ExecutionStatus.aborted
          : ExecutionStatus.failed;
        try {
          await executionClient.updateStatus(executionId, status, {
            error: serializeExecutionError(error),
          });
        } catch (statusErr) {
          this.logger.error(
            `Failed to update status for local execution ${executionId}: ${statusErr.message}`
          );
        }
      })
      .finally(() => {
        abortMonitor.stop();
        heartbeatReporter.stop();
      });
  }

  /**
   * Determine whether execution should run on a Task Manager node.
   *
   * 1. If `useTaskManager` is explicitly provided, honour it.
   * 2. If the request is a fakeRequest (already running on TM), run locally.
   * 3. Otherwise, run on task manager.
   */
  private async shouldUseScheduledTask(
    request: KibanaRequest,
    useTaskManager?: boolean
  ): Promise<boolean> {
    if (useTaskManager !== undefined) {
      return useTaskManager;
    }
    if (request.isFakeRequest) {
      return false;
    }
    return true;
  }

  /**
   * Find executions matching the given filters. Defaults to the current space derived from request.
   * Callers that override spaceId are responsible for their own authorization when querying cross-space.
   */
  async findExecutions(
    request: KibanaRequest,
    options?: FindExecutionsOptions
  ): Promise<AgentExecution[]> {
    const defaultSpaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });
    const executionClient = this.createExecutionClient();
    return executionClient.find({
      ...options,
      spaceId: options?.spaceId || defaultSpaceId,
    });
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
