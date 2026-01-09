/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import { AIMessage, AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import type { OperatorFunction } from 'rxjs';
import { EMPTY, mergeMap, of } from 'rxjs';
import {
  type MessageChunkEvent,
  type MessageCompleteEvent,
  type ToolCallEvent,
  type ToolResultEvent,
  type ReasoningEvent,
  type OtherResult,
  ToolResultType,
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
  createThinkingCompleteEvent,
  toolIdentifierFromToolCall,
} from '@kbn/onechat-genai-utils/langchain';
import type { Logger } from '@kbn/logging';
import type { StateType } from './state';
import { steps, tags } from './constants';
import { Command } from '@langchain/langgraph';
import { createErrorResult, RunToolReturn } from '@kbn/onechat-server';
import { isArray } from 'lodash';

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
  startTime
}: {
  graphName: string;
  toolIdMapping: ToolIdMapping;
  logger: Logger;
  startTime: Date;
}): OperatorFunction<LangchainStreamEvent, ConvertedEvents> => {
  return (streamEvents$) => {
    const toolCallIdToIdMap = new Map<string, string>();
    const messageId = uuidv4();

    let isThinkingComplete = false;

    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // stream answering text chunks for the UI
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, tags.answerAgent)) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);
          if (textContent) {
            const events: ConvertedEvents[] = [];
            if (!isThinkingComplete) {
              // Emit thinking complete event when first chunk arrives
              events.push(createThinkingCompleteEvent(Date.now() - startTime.getTime()));
              isThinkingComplete = true;
            }
            
            events.push(createTextChunkEvent(textContent, { messageId }));
            return of(...events);
          }
        }

        // emit tool calls for research agent steps
        if (matchEvent(event, 'on_chain_end') && matchName(event, "researchAgent.after_model")) {
          const events: ConvertedEvents[] = [];
          const messages = event.data.output.messages as BaseMessage[];
          const lastMessage = messages[messages.length - 1] as AIMessage;
          const toolCalls = extractToolCalls(lastMessage);

          if (toolCalls.length > 0 && lastMessage) {
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
        if (matchEvent(event, 'on_chain_end') && matchName(event, steps.answerAgent)) {
          const events: ConvertedEvents[] = [];

          // process last emitted message
          const messages = (event.data.output as StateType).messages;
          const lastMessage = messages[messages.length - 1] as BaseMessage;

          const messageEvent = createMessageEvent(extractTextContent(lastMessage), {
            messageId,
          });
          events.push(messageEvent);

          return of(...events);
        }

        // emit tool result events
        if (matchEvent(event, 'on_tool_end')) {
          const output = event.data.output as BaseMessage | Command;
          let messages: BaseMessage[] = [];
          if (output instanceof Command && output.update && "messages" in output.update) {
            messages = output.update?.messages as BaseMessage[];
          } else if (BaseMessage.isInstance(output)) {
            messages = [output];
          }

          const toolMessages = messages.filter(ToolMessage.isInstance);

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


/**
 * Custom extractToolReturn because the one from @kbn/onechat-genai-utils/langchain
 * requires tools to return artifacts and built in tools do not do that.
 */

export const extractToolReturn = (message: ToolMessage): RunToolReturn => {
  if (message.artifact) {
    if (!isArray(message.artifact.results)) {
      throw new Error(
        `Artifact is not a structured tool artifact. Received artifact=${JSON.stringify(
          message.artifact
        )}`
      );
    }

    return message.artifact as RunToolReturn;
  } else {
    // langchain tool validation error (such as schema errors) are out of our control and don't emit artifacts...
    const content = extractTextContent(message);
    if (content.startsWith('Error:')) {
      return {
        results: [createErrorResult(content)],
      };
    } else {
      const otherToolResult: OtherResult = {
        tool_result_id: message.tool_call_id,
        type: ToolResultType.other,
        data: {
          content: message.content,
        },
      }

      return {
        results: [otherToolResult]
      };
    }
  }
};

