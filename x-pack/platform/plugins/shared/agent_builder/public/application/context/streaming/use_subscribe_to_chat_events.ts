/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
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
}

/**
 * Subscribe to a chat event stream and dispatch every event to the conversation cache via
 * `conversationActions`. Returns a Promise that resolves when the stream completes (success
 * or abort) and rejects on a real error.
 *
 * Plain function (not a hook) so mutation `mutationFn` can call it inline. Takes
 * `conversationActions` as a parameter rather than reading from React context — each mutation
 * builds its own actions targeting the mutation-owned conversation id, so events keep writing
 * to the right cache regardless of where the user has navigated.
 */
export const subscribeToChatEvents = ({
  events$,
  conversationActions,
  browserApiTools,
  browserToolExecutor,
  isAborted,
}: SubscribeOptions): Promise<void> => {
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
      // Skip transient reasoning entirely. The backend emits these as
      // throwaway "thinking..." placeholders that aren't meant to be
      // persisted, rendered as a step, or surfaced as the live indicator.
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
    } else if (isConversationCreatedEvent(event)) {
      conversationActions.onConversationCreated({ title: event.data.title });
    } else if (isConversationUpdatedEvent(event)) {
      conversationActions.invalidateConversation();
    } else if (isThinkingCompleteEvent(event)) {
      conversationActions.setTimeToFirstToken({
        timeToFirstToken: event.data.time_to_first_token,
      });
    } else if (isPromptRequestEvent(event)) {
      conversationActions.addPendingPrompt({
        prompt: event.data.prompt,
      });
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
