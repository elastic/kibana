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
  ConversationRoundStepType,
} from '@kbn/agent-builder-common';
import {
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { i18n } from '@kbn/i18n';
import { finalize, type Observable, type Subscription } from 'rxjs';
import { isBrowserToolCallEvent } from '@kbn/agent-builder-common/chat/events';
import { useRef } from 'react';
import { useConversationContext } from '../conversation/conversation_context';
import type { BrowserToolExecutor } from '../../services/browser_tool_executor';

export const useSubscribeToChatEvents = ({
  setAgentReasoning,
  setIsResponseLoading,
  isAborted,
  browserToolExecutor,
}: {
  setAgentReasoning: (agentReasoning: string) => void;
  setIsResponseLoading: (isResponseLoading: boolean) => void;
  isAborted: () => boolean;
  browserToolExecutor?: BrowserToolExecutor;
}) => {
  const { conversationActions, browserApiTools } = useConversationContext();
  const unsubscribedRef = useRef(false);
  const subscriptionRef = useRef<Subscription | null>(null);

  const unsubscribeFromChatEvents = () => {
    unsubscribedRef.current = true;
    subscriptionRef.current?.unsubscribe();
  };

  const nextChatEvent = (event: ChatEvent) => {
    // chunk received, we append it to the chunk buffer
    if (isMessageChunkEvent(event)) {
      conversationActions.addAssistantMessageChunk({ messageChunk: event.data.text_chunk });
    }
    // full message received, override chunk buffer
    else if (isMessageCompleteEvent(event)) {
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
      // Individual tool progression message should also be displayed as reasoning
      // (but skip internal progress messages)
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
        }),
      });
    } else if (isBrowserToolCallEvent(event)) {
      // Check if this is a browser tool call and execute it immediately
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
      // Now we have the full response and can stop the loading indicators
      setIsResponseLoading(false);
    } else if (isConversationCreatedEvent(event)) {
      const { conversation_id: id, title } = event.data;
      conversationActions.onConversationCreated({ conversationId: id, title });
    } else if (isThinkingCompleteEvent(event)) {
      conversationActions.setTimeToFirstToken({
        timeToFirstToken: event.data.time_to_first_token,
      });
    } else if (isPromptRequestEvent(event)) {
      conversationActions.addPendingPrompt({
        prompt: event.data.prompt,
      });
      // Stop loading when a prompt is requested - the round is now awaiting user input
      setIsResponseLoading(false);
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
    }
  };

  const subscribeToChatEvents = (events$: Observable<ChatEvent>) => {
    return new Promise<void>((resolve, reject) => {
      if (unsubscribedRef.current) {
        resolve();
        return;
      }
      subscriptionRef.current = events$
        .pipe(
          finalize(() => {
            // When the subscription is unsubscribed from, `complete` will not be called, but the `finalize` callback will be
            if (unsubscribedRef.current) {
              resolve();
            }
          })
        )
        .subscribe({
          next: nextChatEvent,
          complete: () => {
            resolve();
          },
          error: (err) => {
            // If the request is aborted, we don't want to show an error
            if (isAborted()) {
              resolve();
              return;
            }
            reject(err);
          },
        });
    }).finally(() => {
      if (unsubscribedRef.current) {
        unsubscribedRef.current = false;
      }
    });
  };

  return { subscribeToChatEvents, unsubscribeFromChatEvents };
};
