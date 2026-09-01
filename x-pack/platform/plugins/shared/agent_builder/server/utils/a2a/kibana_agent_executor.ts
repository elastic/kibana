/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import type {
  Part,
  TextPart,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TaskState,
} from '@a2a-js/sdk';
import {
  isRoundCompleteEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isToolCallEvent,
  isBrowserToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
  isReasoningEvent,
  isPromptRequestEvent,
  AgentExecutionMode,
} from '@kbn/agent-builder-common';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  isAskUserQuestionPrompt,
  isConfirmationPrompt,
  isAuthorizationPrompt,
  AgentPromptType,
} from '@kbn/agent-builder-common/agents';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import type { InternalStartServices } from '../../services';

const generateMessageId = () => `msg-${uuidv4()}`;

const A2A_CONVERSATION_ID_PREFIX = 'a2a-';

const generateA2AConversationId = (id: string) => `${A2A_CONVERSATION_ID_PREFIX}${id}`;

interface StreamContext {
  taskId: string;
  contextId: string;
  /**
   * Tracks the last known messageId from `message_chunk` events, so we can
   * associate a `message_complete` event with the same A2A artifactId.
   */
  currentMessageId?: string;
  /**
   * Set once the first artifact chunk for a given messageId is emitted, so we
   * know to emit subsequent chunks with `append: true`.
   */
  seenArtifactIds: Set<string>;
  /**
   * Artifacts that have received chunks but no closing `lastChunk: true` yet.
   * On any terminal path we synthesize a closing `artifact-update` for each so
   * conforming clients don't treat the artifact as perpetually growing.
   */
  openArtifactIds: Set<string>;
}

/**
 * Build closing `artifact-update` events for any artifact that received chunks
 * but was never closed (`message_complete` missing on a terminal path).
 * Clears the open set as a side effect.
 */
const buildOpenArtifactCloses = (ctx: StreamContext): TaskArtifactUpdateEvent[] => {
  const closes: TaskArtifactUpdateEvent[] = [];
  for (const artifactId of ctx.openArtifactIds) {
    closes.push({
      kind: 'artifact-update',
      taskId: ctx.taskId,
      contextId: ctx.contextId,
      append: true,
      lastChunk: true,
      artifact: { artifactId, parts: [] },
    });
  }
  ctx.openArtifactIds.clear();
  return closes;
};

export interface KibanaAgentExecutorDeps {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
  request: KibanaRequest;
  agentId: string;
  blocking?: boolean;
  isStreaming?: boolean;
  /**
   * Aborted when the client disconnects. Propagated into `executeAgent` so the
   * underlying LLM/tool round is canceled, and observed by the streaming loop
   * so we finish the event bus promptly instead of hanging on the source
   * observable until it naturally terminates.
   */
  abortSignal?: AbortSignal;
}

/**
 * Agent executor that bridges A2A requests to Kibana's agentBuilder system
 */
export class KibanaAgentExecutor implements AgentExecutor {
  private readonly logger: Logger;
  private readonly getInternalServices: () => InternalStartServices;
  private readonly kibanaRequest: KibanaRequest;
  private readonly agentId: string;
  private readonly blocking: boolean;
  private readonly isStreaming: boolean;
  private readonly abortSignal?: AbortSignal;

  constructor({
    logger,
    getInternalServices,
    request,
    agentId,
    blocking = true,
    isStreaming = false,
    abortSignal,
  }: KibanaAgentExecutorDeps) {
    this.logger = logger;
    this.getInternalServices = getInternalServices;
    this.kibanaRequest = request;
    this.agentId = agentId;
    this.blocking = blocking;
    this.isStreaming = isStreaming;
    this.abortSignal = abortSignal;
  }

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, userMessage, contextId } = requestContext;

    try {
      this.logger.debug(
        `A2A: Starting task ${taskId} (contextId=${contextId}, streaming=${this.isStreaming}, blocking=${this.blocking})`
      );

      // Publish the initial Task frame BEFORE executeAgent so the stream always opens with a Task
      if (this.isStreaming) {
        eventBus.publish({
          id: taskId,
          contextId,
          kind: 'task',
          status: { state: 'working', timestamp: new Date().toISOString() },
          history: [],
          artifacts: [],
        });
      }

      const userText = userMessage.parts
        .filter((part: Part): part is TextPart => part.kind === 'text')
        .map((part: TextPart) => part.text)
        .join(' ');

      const { execution } = this.getInternalServices();

      const a2aConversationId = generateA2AConversationId(contextId);

      const { events$ } = await execution.executeAgent({
        mode: AgentExecutionMode.conversation,
        request: this.kibanaRequest,
        useTaskManager: !this.blocking,
        executionId: this.blocking ? undefined : taskId,
        abortSignal: this.abortSignal,
        // Persisted so KibanaTaskStore can echo the same contextId back on `tasks/get` polls.
        metadata: { a2aContextId: contextId },
        params: {
          agentId: this.agentId,
          nextInput: { message: userText },
          conversationId: a2aConversationId,
          autoCreateConversationWithId: true,
        },
      });

      if (this.isStreaming) {
        await this.forwardStreamingEvents({ events$, eventBus, taskId, contextId });
        this.logger.debug(`A2A: Task ${taskId} streaming completed`);
        return;
      }

      if (!this.blocking) {
        eventBus.publish({
          id: taskId,
          contextId,
          kind: 'task',
          status: { state: 'working', timestamp: new Date().toISOString() },
        });
        eventBus.finished();
        this.logger.debug(`A2A: Task ${taskId} scheduled`);
        return;
      }

      // Process execution response (blocking, non-streaming)
      const events = await firstValueFrom(events$.pipe(toArray()));
      const roundCompleteEvent = events.find(isRoundCompleteEvent);

      if (!roundCompleteEvent) {
        throw new Error('No complete response received from execution service');
      }

      const responseText = roundCompleteEvent.data.round.response.message;

      // Send response back through A2A
      eventBus.publish({
        kind: 'message',
        role: 'agent',
        messageId: generateMessageId(),
        parts: [{ kind: 'text', text: responseText }],
        taskId,
        contextId: requestContext.contextId,
      });

      eventBus.finished();
      this.logger.debug(`A2A: Task ${taskId} completed`);
    } catch (error) {
      this.logger.error(`A2A: Task ${taskId} failed: ${error}`);
      this.sendErrorResponse(eventBus, taskId, requestContext.contextId, error);
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    this.logger.debug(`A2A: Canceling task ${taskId}`);

    eventBus.publish({
      kind: 'message',
      role: 'agent',
      messageId: generateMessageId(),
      parts: [{ kind: 'text', text: 'Task was canceled.' }],
      taskId,
      contextId: taskId,
    });

    eventBus.finished();
  }

  private sendErrorResponse(
    eventBus: ExecutionEventBus,
    taskId: string,
    contextId: string,
    error: unknown
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.isStreaming) {
      eventBus.publish(
        buildStatusUpdate({
          taskId,
          contextId,
          state: 'failed',
          text: `Error: ${errorMessage}`,
          final: true,
        })
      );
      eventBus.finished();
      return;
    }

    eventBus.publish({
      kind: 'message',
      role: 'agent',
      messageId: generateMessageId(),
      parts: [{ kind: 'text', text: `Error: ${errorMessage}` }],
      taskId,
      contextId,
    });

    eventBus.finished();
  }

  /**
   * Subscribe to the Agent Builder event stream and translate each event into
   * A2A protocol events published to the event bus.
   */
  private forwardStreamingEvents({
    events$,
    eventBus,
    taskId,
    contextId,
  }: {
    events$: Observable<ChatEvent>;
    eventBus: ExecutionEventBus;
    taskId: string;
    contextId: string;
  }): Promise<void> {
    const ctx: StreamContext = {
      taskId,
      contextId,
      seenArtifactIds: new Set(),
      openArtifactIds: new Set(),
    };
    const signal = this.abortSignal;

    return new Promise((resolve) => {
      let terminated = false;
      // eslint-disable-next-line prefer-const
      let subscription: { unsubscribe: () => void } | undefined;

      const onAbort = () => {
        if (terminated) return;
        this.logger.debug(`A2A: Task ${taskId} aborted by client`);
        finish();
      };

      const finish = () => {
        if (terminated) return;
        terminated = true;
        signal?.removeEventListener('abort', onAbort);
        subscription?.unsubscribe();
        eventBus.finished();
        resolve();
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });

      subscription = events$.subscribe({
        next: (event: ChatEvent) => {
          if (terminated) return;
          let sawTerminal = false;
          try {
            const publishes = translateAgentBuilderEvent(event, ctx);
            for (const p of publishes) {
              eventBus.publish(p);
              if ('final' in p && p.final) sawTerminal = true;
            }
          } catch (translateError) {
            this.logger.error(`A2A: failed to translate event ${event.type}: ${translateError}`);
          }
          if (sawTerminal) finish();
        },
        error: (err: unknown) => {
          if (terminated) return;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`A2A: Task ${taskId} stream error: ${message}`);
          for (const close of buildOpenArtifactCloses(ctx)) eventBus.publish(close);
          eventBus.publish(
            buildStatusUpdate({
              taskId,
              contextId,
              state: 'failed',
              text: `Error: ${message}`,
              final: true,
            })
          );
          finish();
        },
        complete: () => {
          if (terminated) return;
          // Underlying stream completed without a terminal A2A event; emit one.
          for (const close of buildOpenArtifactCloses(ctx)) eventBus.publish(close);
          eventBus.publish(
            buildStatusUpdate({ taskId, contextId, state: 'completed', final: true })
          );
          finish();
        },
      });
    });
  }
}

/**
 * Translate a single Agent Builder event into zero or more A2A events.
 * Exported for direct unit testing.
 */
export const translateAgentBuilderEvent = (
  event: ChatEvent,
  ctx: StreamContext
): Array<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> => {
  const { taskId, contextId } = ctx;

  if (isMessageChunkEvent(event)) {
    const { message_id: messageId, text_chunk: textChunk } = event.data;
    ctx.currentMessageId = messageId;
    const artifactId = messageId;
    const append = ctx.seenArtifactIds.has(artifactId);
    ctx.seenArtifactIds.add(artifactId);
    ctx.openArtifactIds.add(artifactId);
    return [
      {
        kind: 'artifact-update',
        taskId,
        contextId,
        append,
        lastChunk: false,
        artifact: {
          artifactId,
          parts: [{ kind: 'text', text: textChunk }],
        },
      },
    ];
  }

  if (isMessageCompleteEvent(event)) {
    const { message_id: messageId, message_content: messageContent } = event.data;
    const artifactId = messageId;
    const alreadyStreamed = ctx.seenArtifactIds.has(artifactId);
    ctx.seenArtifactIds.add(artifactId);
    ctx.openArtifactIds.delete(artifactId);
    if (alreadyStreamed) {
      // The full text was already streamed via chunks; close the artifact with
      // no additional parts. Clients that reject unknown parts (or render empty
      // text as trailing whitespace) benefit from the empty array.
      return [
        {
          kind: 'artifact-update',
          taskId,
          contextId,
          append: true,
          lastChunk: true,
          artifact: { artifactId, parts: [] },
        },
      ];
    }
    // No chunks were streamed; send the whole message as a single-shot artifact.
    return [
      {
        kind: 'artifact-update',
        taskId,
        contextId,
        append: false,
        lastChunk: true,
        artifact: {
          artifactId,
          parts: [{ kind: 'text', text: messageContent }],
        },
      },
    ];
  }

  if (isToolCallEvent(event) || isBrowserToolCallEvent(event)) {
    return [
      buildStatusUpdate({
        taskId,
        contextId,
        state: 'working',
        text: `Calling tool ${event.data.tool_id}...`,
      }),
    ];
  }

  if (isToolProgressEvent(event)) {
    return [
      buildStatusUpdate({
        taskId,
        contextId,
        state: 'working',
        text: event.data.message,
      }),
    ];
  }

  if (isToolResultEvent(event)) {
    return [
      buildStatusUpdate({
        taskId,
        contextId,
        state: 'working',
        text: `Tool ${event.data.tool_id} completed`,
      }),
    ];
  }

  if (isReasoningEvent(event)) {
    return [
      buildStatusUpdate({
        taskId,
        contextId,
        state: 'working',
        text: event.data.reasoning,
      }),
    ];
  }

  if (isPromptRequestEvent(event)) {
    return [
      ...buildOpenArtifactCloses(ctx),
      buildInputRequiredFromPrompt({ taskId, contextId, prompt: event.data.prompt }),
    ];
  }

  if (isRoundCompleteEvent(event)) {
    return [
      ...buildOpenArtifactCloses(ctx),
      buildStatusUpdate({ taskId, contextId, state: 'completed', final: true }),
    ];
  }

  return [];
};

const buildStatusUpdate = ({
  taskId,
  contextId,
  state,
  text,
  parts,
  final = false,
}: {
  taskId: string;
  contextId: string;
  state: TaskState;
  text?: string;
  parts?: Part[];
  final?: boolean;
}): TaskStatusUpdateEvent => {
  const status: TaskStatusUpdateEvent['status'] =
    text || parts
      ? {
          state,
          message: {
            kind: 'message',
            role: 'agent',
            messageId: generateMessageId(),
            parts: parts ?? [{ kind: 'text', text: text ?? '' }],
            taskId,
            contextId,
          },
          timestamp: new Date().toISOString(),
        }
      : { state, timestamp: new Date().toISOString() };

  return {
    kind: 'status-update',
    taskId,
    contextId,
    status,
    final,
  };
};

const buildInputRequiredFromPrompt = ({
  taskId,
  contextId,
  prompt,
}: {
  taskId: string;
  contextId: string;
  prompt: PromptRequest;
}): TaskStatusUpdateEvent => {
  let text = '';
  let dataPayload: Record<string, unknown>;

  if (isConfirmationPrompt(prompt)) {
    text = prompt.message ?? prompt.title ?? 'Confirmation required.';
    dataPayload = {
      type: AgentPromptType.confirmation,
      id: prompt.id,
      title: prompt.title,
      confirm_text: prompt.confirm_text,
      cancel_text: prompt.cancel_text,
      color: prompt.color,
    };
  } else if (isAuthorizationPrompt(prompt)) {
    text = 'Authorization required.';
    dataPayload = { type: AgentPromptType.authorization, prompt };
  } else if (isAskUserQuestionPrompt(prompt)) {
    text =
      prompt.questions
        .map(
          (q, i) =>
            `${i + 1}. ${q.question}${
              q.options?.length ? ` (options: ${q.options.map((o) => o.label).join(', ')})` : ''
            }`
        )
        .join('\n') || 'Question required.';
    dataPayload = {
      type: AgentPromptType.ask_user_question,
      id: prompt.id,
      questions: prompt.questions,
    };
  } else {
    text = 'Input required.';
    dataPayload = { prompt };
  }

  const parts: Part[] = [
    { kind: 'text', text },
    { kind: 'data', data: dataPayload },
  ];

  return buildStatusUpdate({
    taskId,
    contextId,
    state: 'input-required',
    parts,
    final: true,
  });
};
