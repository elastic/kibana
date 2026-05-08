/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { of, shareReplay } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  AgentExecutionMode,
  ChatEventType,
} from '@kbn/agent-builder-common';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type {
  AgentExecutionService,
  AgentExecution,
  ExecuteAgentParams,
  ExecuteAgentResult,
  FollowExecutionOptions,
  FindExecutionsOptions,
  ConversationExecutionParams,
} from '@kbn/agent-builder-server/execution';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { SessionsStart } from '@kbn/agent-builder-server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AttachmentServiceStart } from '../attachments';
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
  attachmentsService: AttachmentServiceStart;
  sessionsService?: SessionsStart;
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
  }: ExecuteAgentParams): Promise<ExecuteAgentResult> {
    // For standing sessions that are currently active: queue the incoming message
    // instead of starting a concurrent round. Skip this check when the execution is
    // itself session-managed (source already set by startRound) to avoid recursion.
    if (
      mode === AgentExecutionMode.conversation &&
      !params.nextInput.source &&
      this.deps.sessionsService
    ) {
      const conversationId = (params as ConversationExecutionParams).conversationId;
      const message = params.nextInput.message;
      if (conversationId && message) {
        const queued = await this.tryQueueForActiveSession(conversationId, message, request);
        if (queued) return queued;
      }
    }

    const executionId = providedExecutionId ?? uuidv4();
    const agentId = params.agentId ?? agentBuilderDefaultAgentId;
    const spaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });

    const executionClient = this.createExecutionClient();

    if (providedExecutionId) {
      const existing = await executionClient.peek(providedExecutionId);
      if (existing) {
        throw createBadRequestError(`Execution with id ${providedExecutionId} already exists`);
      }
    }

    const validatedAttachments = await this.validateAttachmentsIfProvided(
      params.nextInput.attachments,
      request
    );
    const validatedParams = validatedAttachments
      ? { ...params, nextInput: { ...params.nextInput, attachments: validatedAttachments } }
      : params;

    const execution = await executionClient.create({
      executionMode: mode,
      executionId,
      agentId,
      spaceId,
      agentParams: validatedParams,
      parentExecutionId: params.parentExecutionId,
      metadata,
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

    const useScheduledTask = await this.shouldUseScheduledTask(request, useTaskManager);
    if (useScheduledTask) {
      return this.executeWithScheduledTask({ executionId, agentId, request });
    } else {
      return this.executeLocally({ execution, request });
    }
  }

  async getExecution(executionId: string): Promise<AgentExecution | undefined> {
    const executionClient = this.createExecutionClient();
    return executionClient.get(executionId);
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
  private async executeWithScheduledTask({
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
        request,
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
    request,
  }: {
    events$: Observable<ChatEvent>;
    execution: AgentExecution;
    executionClient: AgentExecutionClient;
    abortMonitor: AbortMonitor;
    request: KibanaRequest;
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
        // Post-round: drain the standing session queue if applicable
        await this.drainStandingSessionQueue(execution, request);
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
   * After a conversation round completes, check if it belongs to a standing session
   * and drain the pending trigger queue if so.
   */
  private async drainStandingSessionQueue(
    execution: AgentExecution,
    request: KibanaRequest
  ): Promise<void> {
    const { sessionsService } = this.deps;
    if (!sessionsService) return;
    if (execution.executionMode !== AgentExecutionMode.conversation) return;
    const conversationId = (execution.agentParams as ConversationExecutionParams).conversationId;
    if (!conversationId) return;

    try {
      const client = sessionsService.getScopedClient({ request });
      await client.drainQueue(conversationId, execution.executionId);
    } catch (err) {
      this.logger.debug(`[session] post-round drainQueue failed for ${conversationId}: ${err}`);
    }
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

  /**
   * If the conversation is a standing session currently running a round (status=active),
   * queue the incoming human message as a pending trigger instead of starting a concurrent
   * round. Returns a synthetic ExecuteAgentResult with an empty events$ on success, or
   * null to proceed with normal execution.
   */
  private async tryQueueForActiveSession(
    conversationId: string,
    message: string,
    request: KibanaRequest
  ): Promise<ExecuteAgentResult | null> {
    try {
      const client = this.deps.sessionsService!.getScopedClient({ request });
      const conversation = await client.get(conversationId).catch(() => null);

      if (conversation?.session_mode !== 'standing') return null;

      const ss = conversation.state?.standing_session;
      if (!ss || ss.status !== 'active') return null;

      await client.enqueueTrigger(conversationId, {
        type: 'session_message',
        subscription_id: undefined,
        event: {
          from_session_id: conversationId,
          from_agent_id: conversation.agent_id,
          message,
          message_id: uuidv4(),
        },
      });

      this.logger.debug(
        `[session] ${conversationId} is active; queued human message as pending trigger`
      );

      // Emit a message_complete event so the chat UI shows immediate feedback.
      // No round is created in the conversation — the actual round arrives when
      // the queued trigger fires after the current round finishes.
      const queuedEvent = {
        type: ChatEventType.messageComplete,
        data: {
          message_id: uuidv4(),
          message_content:
            '✓ Message queued — the bot will process it when it finishes its current task.',
        },
      };
      return {
        executionId: uuidv4(),
        events$: of(queuedEvent) as unknown as Observable<ChatEvent>,
      };
    } catch (err) {
      this.logger.debug(
        `[session] queue check failed for ${conversationId}, proceeding normally: ${err}`
      );
      return null;
    }
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }

  private async validateAttachmentsIfProvided(
    attachments: AttachmentInput[] | undefined,
    request: KibanaRequest
  ): Promise<Attachment[] | undefined> {
    if (!attachments || attachments.length === 0) {
      return undefined;
    }

    const validated: Attachment[] = [];
    for (const attachment of attachments) {
      const result = await this.deps.attachmentsService.validate(attachment, request);
      if (!result.valid) {
        throw createBadRequestError(`Attachment validation failed: ${result.error}`);
      }
      validated.push(result.attachment as Attachment);
    }

    return validated;
  }
}
