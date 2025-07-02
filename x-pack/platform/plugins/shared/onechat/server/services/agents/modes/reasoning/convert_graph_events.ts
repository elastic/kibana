/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { EMPTY, mergeMap, of, OperatorFunction } from 'rxjs';
import {
  ChatAgentEventType,
  MessageChunkEvent,
  MessageCompleteEvent,
  ToolCallEvent,
  ToolResultEvent,
  ReasoningEvent,
} from '@kbn/onechat-common/agents';
import { StructuredToolIdentifier, toStructuredToolIdentifier } from '@kbn/onechat-common/tools';
import {
  matchGraphName,
  matchEvent,
  matchName,
  hasTag,
  createTextChunkEvent,
  extractTextContent,
  extractToolCalls,
  toolIdentifierFromToolCall,
  createReasoningEvent,
  ToolIdMapping,
} from '@kbn/onechat-genai-utils/langchain';
import { isMessage, isReasoningStep } from './actions';
import type { StateType } from './graph';

export type ConvertedEvents =
  | MessageChunkEvent
  | MessageCompleteEvent
  | ToolCallEvent
  | ToolResultEvent
  | ReasoningEvent;

export const convertGraphEvents = ({
  graphName,
  toolIdMapping,
  runName,
}: {
  graphName: string;
  runName: string;
  toolIdMapping: ToolIdMapping;
}): OperatorFunction<LangchainStreamEvent, ConvertedEvents> => {
  return (streamEvents$) => {
    const toolCallIdToIdMap = new Map<string, StructuredToolIdentifier>();

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // emit reasoning events
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'reason')) {
          const state = event.data.output as StateType;
          const reasoningEvents = state.addedMessages.filter(isReasoningStep);
          const lastReasoningEvent = reasoningEvents[reasoningEvents.length - 1];

          return of(createReasoningEvent(lastReasoningEvent.reasoning));
        }

        // stream text chunks for the UI
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'reasoning:act')) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);
          if (textContent) {
            return of(createTextChunkEvent(chunk));
          }
        }

        // emit tool calls or full message on each agent step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'act')) {
          const state = event.data.output as StateType;
          const addedMessages = state.addedMessages.filter(isMessage);
          const lastMessage = addedMessages[addedMessages.length - 1];

          const toolCalls = extractToolCalls(lastMessage);
          if (toolCalls.length > 0) {
            const toolCallEvents: ToolCallEvent[] = [];

            for (const toolCall of toolCalls) {
              const toolId = toolIdentifierFromToolCall(toolCall, toolIdMapping);
              toolCallIdToIdMap.set(toolCall.toolCallId, toolId);
              toolCallEvents.push({
                type: ChatAgentEventType.toolCall,
                data: {
                  toolId,
                  toolCallId: toolCall.toolCallId,
                  args: toolCall.args,
                },
              });
            }

            return of(...toolCallEvents);
          } else {
            const messageEvent: MessageCompleteEvent = {
              type: ChatAgentEventType.messageComplete,
              data: {
                messageId: lastMessage.id ?? 'unknown',
                messageContent: extractTextContent(lastMessage),
              },
            };

            return of(messageEvent);
          }
        }

        // emit tool result events
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'tools')) {
          const toolMessages: ToolMessage[] = event.data.output.addedMessages ?? [];

          const toolResultEvents: ToolResultEvent[] = [];
          for (const toolMessage of toolMessages) {
            const toolId = toolCallIdToIdMap.get(toolMessage.tool_call_id);
            toolResultEvents.push({
              type: ChatAgentEventType.toolResult,
              data: {
                toolCallId: toolMessage.tool_call_id,
                toolId: toolId ?? toStructuredToolIdentifier('unknown'),
                result: extractTextContent(toolMessage),
              },
            });
          }

          return of(...toolResultEvents);
        }

        // run is finished
        // if (event.event === 'on_chain_end' && event.name === runName) {}

        return EMPTY;
      })
    );
  };
};
