/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { EMPTY, map, merge, mergeMap, of, OperatorFunction, share, toArray } from 'rxjs';
import {
  ChatAgentEventType,
  isMessageCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  MessageChunkEvent,
  MessageCompleteEvent,
  RoundCompleteEvent,
  ToolCallEvent,
  ToolResultEvent,
} from '@kbn/onechat-common/agents';
import { RoundInput, ConversationRoundStepType } from '@kbn/onechat-common/chat';
import { StructuredToolIdentifier, toStructuredToolIdentifier } from '@kbn/onechat-common/tools';
import { extractTextContent, getToolCalls } from './utils/from_langchain_messages';

export type ConvertedEvents =
  | MessageChunkEvent
  | MessageCompleteEvent
  | ToolCallEvent
  | ToolResultEvent;

export const addRoundCompleteEvent = ({
  userInput,
}: {
  userInput: RoundInput;
}): OperatorFunction<ConvertedEvents, ConvertedEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<ConvertedEvents[], RoundCompleteEvent>((events) => {
          const toolCalls = events.filter(isToolCallEvent).map((event) => event.data);
          const toolResults = events.filter(isToolResultEvent).map((event) => event.data);
          const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
          const event: RoundCompleteEvent = {
            type: ChatAgentEventType.roundComplete,
            data: {
              round: {
                userInput,
                steps: toolCalls.map((toolCall) => {
                  const toolResult = toolResults.find(
                    (result) => result.toolCallId === toolCall.toolCallId
                  );
                  return {
                    type: ConversationRoundStepType.toolCall,
                    toolCallId: toolCall.toolCallId,
                    toolId: toolCall.toolId,
                    args: toolCall.args,
                    result: toolResult?.result ?? 'unknown',
                  };
                }),
                assistantResponse: { message: messages[messages.length - 1].messageContent },
              },
            },
          };

          return event;
        })
      )
    );
  };
};

export const convertGraphEvents = ({
  graphName,
  runName,
}: {
  graphName: string;
  runName: string;
}): OperatorFunction<LangchainStreamEvent, ConvertedEvents> => {
  return (streamEvents$) => {
    const toolCallIdToIdMap = new Map<string, StructuredToolIdentifier>();

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // stream text chunks for the UI
        if (event.event === 'on_chat_model_stream') {
          const chunk: AIMessageChunk = event.data.chunk;
          const chunkEvent: MessageChunkEvent = {
            type: ChatAgentEventType.messageChunk,
            data: {
              messageId: chunk.id ?? 'todo',
              textChunk: extractTextContent(chunk),
            },
          };

          return of(chunkEvent);
        }

        // emit tool calls or full message on each agent step
        if (event.event === 'on_chain_end' && event.name === 'agent') {
          const addedMessages: BaseMessage[] = event.data.output.addedMessages ?? [];
          const lastMessage = addedMessages[addedMessages.length - 1];

          const toolCalls = getToolCalls(lastMessage);
          if (toolCalls.length > 0) {
            const toolCallEvents: ToolCallEvent[] = [];

            for (const toolCall of toolCalls) {
              toolCallIdToIdMap.set(toolCall.toolCallId, toolCall.toolId);
              toolCallEvents.push({
                type: ChatAgentEventType.toolCall,
                data: {
                  toolId: toolCall.toolId,
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
        if (event.event === 'on_chain_end' && event.name === 'tools') {
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

const matchGraphName = (event: LangchainStreamEvent, graphName: string): boolean => {
  return event.metadata.graphName === graphName;
};
