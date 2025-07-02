/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { EMPTY, mergeMap, of, OperatorFunction } from 'rxjs';
import {
  MessageChunkEvent,
  MessageCompleteEvent,
  ToolCallEvent,
  ToolResultEvent,
} from '@kbn/onechat-common/agents';
import { StructuredToolIdentifier, toStructuredToolIdentifier } from '@kbn/onechat-common/tools';
import {
  matchGraphName,
  matchEvent,
  matchName,
  createTextChunkEvent,
  createMessageEvent,
  createToolCallEvent,
  createToolResultEvent,
  extractTextContent,
  extractToolCalls,
  toolIdentifierFromToolCall,
  ToolIdMapping,
} from '@kbn/onechat-genai-utils/langchain';

export type ConvertedEvents =
  | MessageChunkEvent
  | MessageCompleteEvent
  | ToolCallEvent
  | ToolResultEvent;

export const convertGraphEvents = ({
  graphName,
  toolIdMapping,
}: {
  graphName: string;
  toolIdMapping: ToolIdMapping;
}): OperatorFunction<LangchainStreamEvent, ConvertedEvents> => {
  return (streamEvents$) => {
    const toolCallIdToIdMap = new Map<string, StructuredToolIdentifier>();
    const messageId = uuidv4();

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // stream text chunks for the UI
        if (matchEvent(event, 'on_chat_model_stream')) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);
          if (textContent) {
            return of(createTextChunkEvent(textContent, { messageId }));
          }
        }

        // emit tool calls or full message on each agent step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'agent')) {
          const addedMessages: BaseMessage[] = event.data.output.addedMessages ?? [];
          const lastMessage = addedMessages[addedMessages.length - 1];

          const toolCalls = extractToolCalls(lastMessage);
          if (toolCalls.length > 0) {
            const toolCallEvents: ToolCallEvent[] = [];

            for (const toolCall of toolCalls) {
              const toolId = toolIdentifierFromToolCall(toolCall, toolIdMapping);
              const { toolCallId, args } = toolCall;
              toolCallIdToIdMap.set(toolCall.toolCallId, toolId);
              toolCallEvents.push(createToolCallEvent({ toolId, toolCallId, args }));
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
            toolResultEvents.push(
              createToolResultEvent({
                toolCallId: toolMessage.tool_call_id,
                toolId: toolId ?? toStructuredToolIdentifier('unknown'),
                result: extractTextContent(toolMessage),
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
