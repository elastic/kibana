/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { EMPTY, mergeMap, of, OperatorFunction } from 'rxjs';
import {
  MessageChunkEvent,
  MessageCompleteEvent,
  ToolCallEvent,
  ToolResultEvent,
  ReasoningEvent,
} from '@kbn/onechat-common';
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
  createToolCallEvent,
  createMessageEvent,
  createToolResultEvent,
  extractToolReturn,
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
    const toolCallIdToIdMap = new Map<string, string>();
    const messageId = uuidv4();

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
            return of(createTextChunkEvent(textContent, { messageId }));
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
              const { toolCallId, args } = toolCall;
              toolCallIdToIdMap.set(toolCall.toolCallId, toolId);
              toolCallEvents.push(
                createToolCallEvent({
                  toolId,
                  toolCallId,
                  params: args,
                })
              );
            }

            return of(...toolCallEvents);
          } else {
            const messageEvent = createMessageEvent(extractTextContent(lastMessage), {
              messageId,
            });

            return of(messageEvent);
          }
        }

        // emit tool result events
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'tools')) {
          const toolMessages: ToolMessage[] = event.data.output.addedMessages ?? [];

          const toolResultEvents: ToolResultEvent[] = [];
          for (const toolMessage of toolMessages) {
            const toolId = toolCallIdToIdMap.get(toolMessage.tool_call_id);
            const toolReturn = extractToolReturn(toolMessage);
            toolResultEvents.push(
              createToolResultEvent({
                toolCallId: toolMessage.tool_call_id,
                toolId: toolId ?? 'unknown',
                result: JSON.stringify(toolReturn.result),
              })
            );
          }

          return of(...toolResultEvents);
        }

        return EMPTY;
      })
    );
  };
};
