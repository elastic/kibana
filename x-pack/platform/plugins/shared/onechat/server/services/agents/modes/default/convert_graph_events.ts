/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import type { OperatorFunction } from 'rxjs';
import { EMPTY, mergeMap, of } from 'rxjs';
import type {
  MessageChunkEvent,
  MessageCompleteEvent,
  ToolCallEvent,
  ToolResultEvent,
  ReasoningEvent,
} from '@kbn/onechat-common';
import type { ToolIdMapping } from '@kbn/onechat-genai-utils/langchain';
import {
  matchGraphName,
  matchEvent,
  matchName,
  hasTag,
  createTextChunkEvent,
  createMessageEvent,
  createToolCallEvent,
  createToolResultEvent,
  createReasoningEvent,
  extractTextContent,
  extractToolCalls,
  extractToolReturn,
  toolIdentifierFromToolCall,
} from '@kbn/onechat-genai-utils/langchain';
import type { Logger } from '@kbn/logging';
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
  logger,
}: {
  graphName: string;
  toolIdMapping: ToolIdMapping;
  logger: Logger;
}): OperatorFunction<LangchainStreamEvent, ConvertedEvents> => {
  return (streamEvents$) => {
    const toolCallIdToIdMap = new Map<string, string>();
    const messageId = uuidv4();

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // stream answering text chunks for the UI
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'answering-step')) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);
          if (textContent) {
            return of(createTextChunkEvent(textContent, { messageId }));
          }
        }

        // emit tool calls for agent step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'agent')) {
          const events: ConvertedEvents[] = [];

          // process last emitted message
          const lastMessage: BaseMessage = event.data.output.nextMessage;
          const toolCalls = extractToolCalls(lastMessage);

          if (toolCalls.length > 0) {
            const messageText = extractTextContent(lastMessage);
            let hasReasoningEvent = false;

            for (const toolCall of toolCalls) {
              const toolId = toolIdentifierFromToolCall(toolCall, toolIdMapping);
              const { toolCallId, args } = toolCall;

              const { _reasoning, ...toolCallArgs } = args;
              if (_reasoning) {
                events.push(createReasoningEvent(_reasoning));
                hasReasoningEvent = true;
              }

              toolCallIdToIdMap.set(toolCall.toolCallId, toolId);
              events.push(
                createToolCallEvent({
                  toolId,
                  toolCallId,
                  params: toolCallArgs,
                })
              );
            }
            if (messageText && !hasReasoningEvent) {
              events.push(createReasoningEvent(messageText));
            }
          }

          return of(...events);
        }

        // emit messages for answering step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'answer')) {
          const events: ConvertedEvents[] = [];

          // process last emitted message
          const addedMessages: BaseMessage[] = event.data.output.addedMessages ?? [];
          const lastMessage = addedMessages[addedMessages.length - 1];

          const messageEvent = createMessageEvent(extractTextContent(lastMessage), {
            messageId,
          });
          events.push(messageEvent);

          return of(...events);
        }

        // emit tool result events
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'tools')) {
          const toolMessages = ((event.data.output as StateType).addedMessages ?? []).filter(
            isToolMessage
          );

          const toolResultEvents: ToolResultEvent[] = [];
          for (const toolMessage of toolMessages) {
            const toolId = toolCallIdToIdMap.get(toolMessage.tool_call_id);
            const toolReturn = extractToolReturn(toolMessage);
            toolResultEvents.push(
              createToolResultEvent({
                toolCallId: toolMessage.tool_call_id,
                toolId: toolId ?? 'unknown',
                results: toolReturn.results,
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
