/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { isArray } from 'lodash';
import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import { AIMessageChunk, BaseMessage, BaseMessageLike, ToolMessage } from '@langchain/core/messages';
import type { OperatorFunction } from 'rxjs';
import { EMPTY, mergeMap, of } from 'rxjs';
import {
  type MessageChunkEvent,
  type MessageCompleteEvent,
  type ThinkingCompleteEvent,
  type ToolCallEvent,
  type BrowserToolCallEvent,
  type ToolResultEvent,
  type ReasoningEvent,
  ToolResultType,
  OtherResult,
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
  createBrowserToolCallEvent,
  createToolResultEvent,
  createReasoningEvent,
  createThinkingCompleteEvent,
  extractTextContent,
  toolIdentifierFromToolCall,
} from '@kbn/onechat-genai-utils/langchain';
import type { Logger } from '@kbn/logging';
import type { RunToolReturn } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import type { StateType } from './state';
import { steps, tags, BROWSER_TOOL_PREFIX } from './constants';
import { isToolCallAction, isAnswerAction, isExecuteToolAction } from './actions';
import type { ToolCallResult } from './actions';
import { processAnswerResponse, processResearchResponse, processToolNodeResponse } from './action_utils';
import { Command } from '@langchain/langgraph';

export type ConvertedEvents =
  | MessageChunkEvent
  | MessageCompleteEvent
  | ThinkingCompleteEvent
  | ToolCallEvent
  | BrowserToolCallEvent
  | ToolResultEvent
  | ReasoningEvent;

export const convertGraphEvents = ({
  graphName,
  toolIdMapping,
  logger,
  startTime,
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
        console.log(event)
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
          const lastMessage = messages[messages.length - 1];
          if(!AIMessageChunk.isInstance(lastMessage)){
            return EMPTY;
          }
          const action = processResearchResponse(lastMessage);
          const nextAction = action

          console.log("nextAction");
          console.log(messages);
          console.log(nextAction);

          if (isToolCallAction(nextAction)) {
            const { tool_calls: toolCalls, message: messageText } = nextAction;
            if (toolCalls.length > 0) {
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

                const isBrowserTool = toolId.startsWith(BROWSER_TOOL_PREFIX);

                if (isBrowserTool) {
                  events.push(
                    createBrowserToolCallEvent({
                      toolId: toolId.replace(BROWSER_TOOL_PREFIX, ''),
                      toolCallId,
                      params: toolCallArgs,
                    })
                  );
                } else {
                  events.push(
                    createToolCallEvent({
                      toolId,
                      toolCallId,
                      params: toolCallArgs,
                    })
                  );
                }
              }
              if (messageText && !hasReasoningEvent) {
                events.push(createReasoningEvent(messageText));
              }
            }
          }

          return of(...events);
        }

        // emit messages for answering step
        if (matchEvent(event, 'on_chain_end') && matchName(event, "answerAgent.after_agent")) {
          const events: ConvertedEvents[] = [];

          // process last emitted message
          const messages = event.data.output.messages as BaseMessage[];
          const lastMessage = messages[messages.length - 1];
          if(!AIMessageChunk.isInstance(lastMessage)){
            return EMPTY;
          }
          const action = processAnswerResponse(lastMessage);
          const lastAction = action

          if (isAnswerAction(lastAction)) {
            const messageEvent = createMessageEvent(lastAction.message, {
              messageId,
            });
            events.push(messageEvent);
          }

          return of(...events);
        }

        // emit tool result events
        if (matchEvent(event, 'on_tool_end')) {
          const output = event.data.output as BaseMessage | Command;
          let messages: BaseMessage[] = [];
          if(output instanceof Command && output.update && "messages" in output.update){
            messages = output.update?.messages as BaseMessage[];
          } else if(BaseMessage.isInstance(output)){
            messages = [output];
          }

          const action = processToolNodeResponse(messages);
          const nextAction = action;

          if (isExecuteToolAction(nextAction)) {
            const toolResultEvents: ToolResultEvent[] = [];
            for (const toolResult of nextAction.tool_results) {
              const toolId = toolCallIdToIdMap.get(toolResult.toolCallId);
              const toolReturn = extractToolReturn(toolResult);
              toolResultEvents.push(
                createToolResultEvent({
                  toolCallId: toolResult.toolCallId,
                  toolId: toolId ?? 'unknown',
                  results: toolReturn.results,
                })
              );
            }

            return of(...toolResultEvents);
          }
        }

        return EMPTY;
      })
    );
  };
};

export const extractToolReturn = (message: ToolCallResult): RunToolReturn => {
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
    if (message.content.startsWith('Error:')) {
      return {
        results: [createErrorResult(message.content)],
      };
    } else {
      const otherToolResult: OtherResult = {
        tool_result_id: message.toolCallId,
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
