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
import type { ChatEvent, InteractivityConfig } from '@kbn/agent-builder-common';
import {
  AgentExecutionMode,
  ChatTriggerMode,
  agentBuilderDefaultAgentId,
  createBadRequestError,
  createInternalError,
  isEventsNativeVersion,
  normalizeInteractive,
} from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { attachmentChangesToEvents } from '@kbn/agent-builder-server/attachments';
import type {
  AgentExecutionService,
  AgentExecution,
  ConversationExecutionParams,
  ExecuteAgentParams,
  ExecuteAgentResult,
  FollowExecutionOptions,
  FindExecutionsOptions,
} from '@kbn/agent-builder-server/execution';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import { isVersionConflictError } from '../../utils/is_version_conflict_error';
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
import { HeartbeatReporter } from './task/heartbeat_reporter';
import { followExecution$ } from './execution_follower';
import {
  getConversation,
  isPendingResumeConversation,
  persistUserMessage,
  type ConversationWithOperation,
} from './utils/conversations';
import {
  createConversationCreatedEvent,
  createConversationIdSetEvent,
  createConversationUpdatedEvent,
} from './utils/events';
import { roundUserMessageEventId, userMessageActor } from '../conversation/client/rounds_to_events';
import type { ConversationClient } from '../conversation';

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

/** A resolved conversation and the client scoped to the request that resolved it. */
interface ConversationTarget {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
}

class AgentExecutionServiceImpl implements AgentExecutionService {
  private readonly deps: AgentExecutionServiceDeps;
  private readonly logger: Logger;

  constructor(deps: AgentExecutionServiceDeps) {
    this.deps = deps;
    this.logger = deps.logger;
  }

  /**
   * Runs an agent, and owns the one place a user message is persisted. A conversation request
   * persists its message before anything executes, so it survives a failed run; with
   * `trigger_mode: 'never'` the write is all that happens and no execution is created.
   */
  async executeAgent(args: ExecuteAgentParams): Promise<ExecuteAgentResult> {
    const {
      request,
      mode,
      params,
      executionId: providedExecutionId,
      useTaskManager,
      abortSignal,
      metadata,
      interactive,
    } = args;
    const executionId = providedExecutionId ?? uuidv4();
    const agentId = params.agentId ?? agentBuilderDefaultAgentId;
    const spaceId = getCurrentSpaceId({ request, spaces: this.deps.spaces });
    const interactivity = normalizeInteractive(interactive, mode);

    const executionClient = this.createExecutionClient();

    const conversationParams =
      args.mode === AgentExecutionMode.conversation
        ? await this.validateAttachments(args.params, request)
        : undefined;
    const validatedParams = conversationParams ?? (await this.validateAttachments(params, request));

    const roundId = uuidv4();
    const receivedAt = new Date();

    // Resolving up front keeps conversation creation and the message write on the request node,
    // before a Task Manager run is scheduled.
    const target = conversationParams
      ? await this.resolveConversation({ request, agentId, params: conversationParams })
      : undefined;

    if (conversationParams && target) {
      if (conversationParams.triggerMode === ChatTriggerMode.Never) {
        return this.appendUserMessage({
          request,
          params: conversationParams,
          target,
          receivedAt,
        });
      }
    }

    let execution: AgentExecution;
    try {
      execution = await executionClient.create({
        executionMode: mode,
        executionId,
        agentId,
        spaceId,
        agentParams:
          conversationParams && target
            ? {
                ...conversationParams,
                // The conversation is resolved, and created when it was new, before the run is
                // dispatched — so the run reads it rather than resolving it again.
                conversationId: target.conversation.id,
                autoCreateConversationWithId: true,
                conversationCreated: target.conversation.operation === 'CREATE',
                roundId,
              }
            : validatedParams,
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

    // After the record, so an idempotency-key replay is detected before a second message lands.
    if (conversationParams && target && this.shouldPersistRoundInput(conversationParams, target)) {
      await persistUserMessage({
        conversation: target.conversation,
        conversationClient: target.conversationClient,
        eventId: roundUserMessageEventId(roundId),
        receivedAt,
        input: conversationParams.nextInput,
        author: await this.deps.conversationService.getConversationRoundAuthor({
          request,
          origin: conversationParams.origin,
        }),
        ...(conversationParams.origin ? { origin: { type: conversationParams.origin.type } } : {}),
      });
    }

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
      return this.executeLocally({ execution, request, interactivity });
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
      this.logger.warn(`Ignoring abort for unknown execution ${executionId}`);
      return;
    }

    if (
      execution.status !== ExecutionStatus.scheduled &&
      execution.status !== ExecutionStatus.running
    ) {
      this.logger.debug(
        `Ignoring abort for execution ${executionId} with terminal status ${execution.status}`
      );
      return;
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

  private async validateAttachments<T extends { nextInput: { attachments?: unknown[] } }>(
    params: T,
    request: KibanaRequest
  ): Promise<T> {
    const validated = await this.deps.attachmentsService.validateAttachmentInputs(
      params.nextInput.attachments as Parameters<
        AttachmentServiceStart['validateAttachmentInputs']
      >[0],
      request
    );

    return validated
      ? { ...params, nextInput: { ...params.nextInput, attachments: validated } }
      : params;
  }

  /** Resolves, and when asked creates, the conversation a request targets. */
  private async resolveConversation({
    request,
    agentId,
    params,
  }: {
    request: KibanaRequest;
    agentId: string;
    params: ConversationExecutionParams;
  }): Promise<ConversationTarget> {
    const conversationClient = await this.deps.conversationService.getScopedClient({ request });
    const conversation = await getConversation({
      agentId,
      conversationId: params.conversationId,
      autoCreateConversationWithId: params.autoCreateConversationWithId,
      conversationClient,
      accessControl: params.accessControl,
      readOnly: params.readOnly,
      origin: params.origin
        ? { external_conversation_id: params.origin.external_conversation_id }
        : undefined,
      subagentCreation: params.subagentCreation,
    });

    return { conversation, conversationClient };
  }

  /** A resume continues a round that is already open, so it does not write a new message. */
  private shouldPersistRoundInput(
    params: ConversationExecutionParams,
    { conversation }: ConversationTarget
  ): boolean {
    const { storeConversation = true } = params;

    return storeConversation && !isPendingResumeConversation(conversation);
  }

  /**
   * The `trigger_mode: 'never'` tail: persist the message and report the conversation, leaving
   * the execution options unused. Emits the same conversation events an execution would, so
   * callers read the conversation id the one way.
   */
  private async appendUserMessage({
    request,
    params,
    target: { conversation, conversationClient },
    receivedAt,
  }: {
    request: KibanaRequest;
    params: ConversationExecutionParams;
    target: ConversationTarget;
    receivedAt: Date;
  }): Promise<ExecuteAgentResult> {
    if (params.storeConversation === false) {
      throw createInternalError('A user message without execution has to be stored');
    }

    const created = conversation.operation === 'CREATE';

    // A conversation this request creates is events-native from its first write; only a stored
    // one can predate that.
    if (!created && !isEventsNativeVersion(conversation.schema_version)) {
      throw createBadRequestError('User messages require canonical event storage');
    }

    const message = params.nextInput.message?.trim() ?? '';
    const attachments = params.nextInput.attachments ?? [];

    if (!message && attachments.length === 0) {
      throw createBadRequestError('User message requests require input or attachments');
    }

    const snapshot = conversation.attachments ?? [];
    const stateManager = this.deps.attachmentsService.createStateManager(snapshot);

    await this.deps.attachmentsService.mergeAttachmentInputs({
      stateManager,
      inputs: attachments,
      request,
      actor: ATTACHMENT_REF_ACTOR.user,
    });

    const user = await this.deps.conversationService.getCurrentUser({ request });
    const author = await this.deps.conversationService.getConversationRoundAuthor({ request });
    const createdAt = receivedAt.toISOString();

    await persistUserMessage({
      conversation,
      conversationClient,
      eventId: uuidv4(),
      receivedAt,
      input: { message, attachment_refs: stateManager.getAccessedRefs() },
      author,
      user,
      additionalEvents: attachmentChangesToEvents(stateManager.drainChanges(), {
        source: 'chat_input',
        actor: userMessageActor({ ...conversation, user }, { author }),
        created_at: createdAt,
      }),
      attachments: { snapshot, produced: stateManager.getAll() },
    });

    const stored = await conversationClient.get(conversation.id);

    return {
      events$: of(
        ...(created ? [createConversationIdSetEvent(stored.id)] : []),
        created ? createConversationCreatedEvent(stored) : createConversationUpdatedEvent(stored)
      ),
    };
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
