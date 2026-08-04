/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  isConversationCreatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isPromptRequestEvent,
  isReasoningEvent,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
  isThinkingCompleteEvent,
  isCompactionStartedEvent,
  isCompactionCompletedEvent,
  isBackgroundAgentCompleteEvent,
  isTodosUpdatedEvent,
  ConversationRoundStepType,
} from '@kbn/agent-builder-common';
import {
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import {
  isBrowserToolResultPrompt,
  type BrowserToolResultPrompt,
  type BrowserToolResultPromptResponse,
  type PromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import { finalize, type Observable } from 'rxjs';
import { isBrowserToolCallEvent } from '@kbn/agent-builder-common/chat/events';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationActions } from '../conversation/use_conversation_actions';
import type { BrowserToolExecutor } from '../../services/browser_tool_executor';

interface SubscribeOptions {
  events$: Observable<ChatEvent>;
  conversationActions: ConversationActions;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  browserToolExecutor?: BrowserToolExecutor;
  isAborted: () => boolean;
  /**
   * When provided, two-way browser tool prompts are executed client-side and
   * this callback resumes the round with the handler results (auto, no UI).
   */
  resumeWithPrompts?: (prompts: Record<string, PromptResponse>) => Observable<ChatEvent>;
}

const MAX_BROWSER_TOOL_RESUME_DEPTH = 8;

/**
 * Subscribe to a chat event stream and dispatch every event to the conversation cache via
 * `conversationActions`. Returns a Promise that resolves when the stream completes (success
 * or abort) and rejects on a real error.
 *
 * Two-way browser tools (`returnsResult`) pause the server round; after the stream ends this
 * helper executes their handlers and optionally auto-resumes via `resumeWithPrompts`.
 */
export const subscribeToChatEvents = async ({
  events$,
  conversationActions,
  browserApiTools,
  browserToolExecutor,
  isAborted,
  resumeWithPrompts,
}: SubscribeOptions): Promise<void> => {
  let depth = 0;
  let currentEvents$ = events$;

  while (depth <= MAX_BROWSER_TOOL_RESUME_DEPTH) {
    const pendingBrowserPrompts: BrowserToolResultPrompt[] = [];

    await subscribeOnce({
      events$: currentEvents$,
      conversationActions,
      browserApiTools,
      browserToolExecutor,
      isAborted,
      onBrowserToolResultPrompt: (prompt) => {
        pendingBrowserPrompts.push(prompt);
      },
    });

    if (isAborted() || pendingBrowserPrompts.length === 0 || !resumeWithPrompts) {
      return;
    }

    const prompts: Record<string, PromptResponse> = {};
    for (const prompt of pendingBrowserPrompts) {
      prompts[prompt.id] = await executeTwoWayBrowserTool({
        prompt,
        browserApiTools,
        browserToolExecutor,
      });
    }

    conversationActions.clearPendingPrompts();
    currentEvents$ = resumeWithPrompts(prompts);
    depth += 1;
  }

  throw new Error(
    `Exceeded max two-way browser tool resume depth (${MAX_BROWSER_TOOL_RESUME_DEPTH})`
  );
};

const executeTwoWayBrowserTool = async ({
  prompt,
  browserApiTools,
  browserToolExecutor,
}: {
  prompt: BrowserToolResultPrompt;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  browserToolExecutor?: BrowserToolExecutor;
}): Promise<BrowserToolResultPromptResponse> => {
  const toolDef = browserApiTools?.find((tool) => tool.id === prompt.tool_id);
  if (!toolDef || !browserToolExecutor) {
    return {
      ok: false,
      error: `Browser tool '${prompt.tool_id}' is not available in the client`,
    };
  }

  const [outcome] = await browserToolExecutor.executeToolCalls(
    [
      {
        tool_id: prompt.tool_id,
        call_id: prompt.tool_call_id,
        params: prompt.params,
        timestamp: Date.now(),
      },
    ],
    new Map([[prompt.tool_id, toolDef]])
  );

  if (!outcome || !outcome.ok) {
    return {
      ok: false,
      error: outcome && !outcome.ok ? outcome.error : 'Browser tool execution failed',
    };
  }

  return {
    ok: true,
    results: outcome.result?.results,
    image: outcome.result?.image,
  };
};

const subscribeOnce = ({
  events$,
  conversationActions,
  browserApiTools,
  browserToolExecutor,
  isAborted,
  onBrowserToolResultPrompt,
}: {
  events$: Observable<ChatEvent>;
  conversationActions: ConversationActions;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  browserToolExecutor?: BrowserToolExecutor;
  isAborted: () => boolean;
  onBrowserToolResultPrompt: (prompt: BrowserToolResultPrompt) => void;
}): Promise<void> => {
  const nextChatEvent = (event: ChatEvent) => {
    if (isMessageChunkEvent(event)) {
      conversationActions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
    } else if (isMessageCompleteEvent(event)) {
      conversationActions.setAssistantMessage({
        assistantMessage: event.data.message_content,
      });
    } else if (isToolProgressEvent(event)) {
      conversationActions.setToolCallProgress({
        progress: {
          message: event.data.message,
          metadata: event.data.metadata ?? {},
        },
        toolCallId: event.data.tool_call_id,
      });
    } else if (isReasoningEvent(event)) {
      if (event.data.transient) {
        return;
      }
      conversationActions.clearAssistantMessage();
      conversationActions.addReasoningStep({
        step: createReasoningStep({
          reasoning: event.data.reasoning,
          tool_call_id: event.data.tool_call_id,
          tool_call_group_id: event.data.tool_call_group_id,
        }),
      });
    } else if (isToolCallEvent(event)) {
      conversationActions.addToolCall({
        step: createToolCallStep({
          params: event.data.params,
          results: [],
          tool_call_id: event.data.tool_call_id,
          tool_id: event.data.tool_id,
          tool_call_group_id: event.data.tool_call_group_id,
          tool_origin: event.data.tool_origin,
        }),
      });
    } else if (isBrowserToolCallEvent(event)) {
      const toolId = event.data.tool_id;
      if (toolId && browserToolExecutor && browserApiTools) {
        const toolDef = browserApiTools.find((tool) => tool.id === toolId);
        // Two-way tools run after the stream ends (paired with prompt_request).
        if (toolDef?.returnsResult) {
          return;
        }
        if (toolDef) {
          const toolsMap = new Map([[toolId, toolDef]]);
          browserToolExecutor
            .executeToolCalls(
              [
                {
                  tool_id: toolId,
                  call_id: event.data.tool_call_id,
                  params: event.data.params,
                  timestamp: Date.now(),
                },
              ],
              toolsMap
            )
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Failed to execute browser tool:', error);
            });
        }
      }
    } else if (isToolResultEvent(event)) {
      const { tool_call_id: toolCallId, results } = event.data;
      conversationActions.setToolCallResult({ results, toolCallId });
    } else if (isRoundCompleteEvent(event)) {
      if (event.data.attachments) {
        conversationActions.setAttachments({ attachments: event.data.attachments });
      }
      conversationActions.onRoundComplete(event.data.round);
    } else if (isConversationCreatedEvent(event)) {
      conversationActions.onConversationCreated({ title: event.data.title });
    } else if (isThinkingCompleteEvent(event)) {
      conversationActions.setTimeToFirstToken({
        timeToFirstToken: event.data.time_to_first_token,
      });
    } else if (isPromptRequestEvent(event)) {
      conversationActions.addPendingPrompt({
        prompt: event.data.prompt,
      });
      if (isBrowserToolResultPrompt(event.data.prompt)) {
        onBrowserToolResultPrompt(event.data.prompt);
      }
    } else if (isCompactionStartedEvent(event)) {
      conversationActions.addCompactionStep({
        tokenCountBefore: event.data.token_count_before,
      });
    } else if (isCompactionCompletedEvent(event)) {
      conversationActions.setCompactionStepComplete({
        tokenCountAfter: event.data.token_count_after,
        summarizedRoundCount: event.data.summarized_round_count,
      });
    } else if (isBackgroundAgentCompleteEvent(event)) {
      conversationActions.addBackgroundExecutionCompleteStep({
        step: {
          type: ConversationRoundStepType.backgroundAgentComplete,
          ...event.data.execution,
        },
      });
    } else if (isTodosUpdatedEvent(event)) {
      conversationActions.addOrUpdateTodosStep({ todos: event.data.data.todos });
    }
  };

  return new Promise<void>((resolve, reject) => {
    events$
      .pipe(
        finalize(() => {
          if (isAborted()) {
            resolve();
          }
        })
      )
      .subscribe({
        next: nextChatEvent,
        complete: () => resolve(),
        error: (err) => {
          if (isAborted()) {
            resolve();
            return;
          }
          reject(err);
        },
      });
  });
};
