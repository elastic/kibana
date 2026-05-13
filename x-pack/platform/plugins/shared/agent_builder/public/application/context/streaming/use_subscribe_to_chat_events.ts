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
import { i18n } from '@kbn/i18n';
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
  setAgentReasoning: (agentReasoning: string) => void;
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
  setAgentReasoning,
}: SubscribeOptions): Promise<void> => {
  const nextChatEvent = (event: ChatEvent) => {
    if (isMessageChunkEvent(event)) {
      conversationActions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
    } else if (isMessageCompleteEvent(event)) {
      conversationActions.setAssistantMessage({
        assistantMessage: event.data.message_content,
      });
    } else if (isToolProgressEvent(event)) {
      const isInternalProgress = event.data.metadata?.internal === 'true';
      conversationActions.setToolCallProgress({
        progress: {
          message: event.data.message,
          metadata: event.data.metadata ?? {},
        },
        toolCallId: event.data.tool_call_id,
      });
      if (!isInternalProgress) {
        setAgentReasoning(event.data.message);
      }
    } else if (isReasoningEvent(event)) {
      conversationActions.addReasoningStep({
        step: createReasoningStep({
          reasoning: event.data.reasoning,
          transient: event.data.transient,
          tool_call_id: event.data.tool_call_id,
          tool_call_group_id: event.data.tool_call_group_id,
        }),
      });
      setAgentReasoning(event.data.reasoning);
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
      // No-op. `isResponseLoading` is derived in `useConversationStream` from `activeStream`,
      // and `activeStream` is cleared in the mutation's `finally` when the stream ends —
      // so we don't need an explicit signal here.
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
    } else if (isCompactionStartedEvent(event)) {
      conversationActions.addCompactionStep({
        tokenCountBefore: event.data.token_count_before,
      });
      setAgentReasoning(
        i18n.translate('xpack.agentBuilder.chatEvents.compactionStarted', {
          defaultMessage: 'Compacting conversation context',
        })
      );
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
