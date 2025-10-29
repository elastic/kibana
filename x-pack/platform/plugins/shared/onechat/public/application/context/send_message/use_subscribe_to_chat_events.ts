/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent } from '@kbn/onechat-common';
import {
  isConversationCreatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isReasoningEvent,
  isRoundCompleteEvent,
  isToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import { createReasoningStep, createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import type { Observable } from 'rxjs';
import { useConversationContext } from '../conversation/conversation_context';

export const useSubscribeToChatEvents = ({
  setAgentReasoning,
  setIsResponseLoading,
  isAborted,
}: {
  setAgentReasoning: (agentReasoning: string) => void;
  setIsResponseLoading: (isResponseLoading: boolean) => void;
  isAborted: () => boolean;
}) => {
  const { conversationActions } = useConversationContext();

  return (events$: Observable<ChatEvent>) => {
    return new Promise<void>((resolve, reject) => {
      events$.subscribe({
        next: (event) => {
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
            conversationActions.setToolCallProgress({
              progress: { message: event.data.message },
              toolCallId: event.data.tool_call_id,
            });
            // Individual tool progression message should also be displayed as reasoning
            setAgentReasoning(event.data.message);
          } else if (isReasoningEvent(event)) {
            conversationActions.addReasoningStep({
              step: createReasoningStep({
                reasoning: event.data.reasoning,
                transient: event.data.transient,
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
              }),
            });
          } else if (isToolResultEvent(event)) {
            const { tool_call_id: toolCallId, results } = event.data;
            conversationActions.setToolCallResult({ results, toolCallId });
          } else if (isRoundCompleteEvent(event)) {
            // Now we have the full response and can stop the loading indicators
            setIsResponseLoading(false);
          } else if (isConversationCreatedEvent(event)) {
            const { conversation_id: id, title } = event.data;
            conversationActions.onConversationCreated({ conversationId: id, title });
          }
        },
        complete: () => {
          resolve();
        },
        error: (err) => {
          // If the request is aborted, we don't want to show an error
          if (isAborted()) {
            setIsResponseLoading(false);
            resolve();
            return;
          }
          reject(err);
        },
      });
    });
  };
};
