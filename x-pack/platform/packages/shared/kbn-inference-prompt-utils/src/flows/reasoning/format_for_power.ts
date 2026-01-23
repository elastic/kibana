/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantMessage } from '@kbn/inference-common';
import {
  MessageRole,
  type Message,
  type ToolMessage,
  type ToolOptions,
} from '@kbn/inference-common';
import { NEXT_TOOL, removeSystemToolCalls } from './planning_tools';
import type { ReasoningPower } from './types';

/**
 * Formats a request for the LLM by:
 * - removing all system tool calls & responses, except the last if it is a system tool
 * - Replacing `reason` tool calls and responses with `next` if power == 'low'
 * - injecting the amount of stepsLeft in the last tool response
 */
export function formatMessages<TMessage extends Message>({}: {
  messages: TMessage[];
  power: ReasoningPower;
  stepsLeft: number;
}): TMessage[];

export function formatMessages({
  messages,
  power,
  stepsLeft,
}: {
  messages: Message[];
  power: ReasoningPower;
  stepsLeft: number;
}): Message[] {
  const lastAssistantMessageWithToolCalls = messages.findLast(
    (message): message is AssistantMessage =>
      message.role === MessageRole.Assistant && !!message.toolCalls?.length
  );

  let next = messages;

  if (lastAssistantMessageWithToolCalls) {
    const indexOfLastAssistantMessage = messages.indexOf(lastAssistantMessageWithToolCalls);

    next = removeSystemToolCalls(messages, indexOfLastAssistantMessage);
  }

  const lastToolResponse = next.findLast(
    (message): message is ToolMessage => message.role === MessageRole.Tool
  );

  next = next.map((message) => {
    if (message === lastToolResponse) {
      return {
        ...lastToolResponse,
        name: power === 'low' && message.name === 'reason' ? 'next' : message.name,
        response: {
          ...(typeof lastToolResponse.response === 'string'
            ? { content: lastToolResponse.response }
            : {}),
          stepsLeft,
        },
      };
    }

    if (message.role === MessageRole.Assistant) {
      return {
        ...message,
        toolCalls:
          power === 'low'
            ? message.toolCalls?.map((toolCall) => {
                if (toolCall.function.name === 'reason') {
                  return {
                    ...toolCall,
                    function: {
                      ...toolCall.function,
                      name: 'next',
                    },
                  };
                }
                return toolCall;
              })
            : message.toolCalls,
      };
    }
    return message;
  });

  return next;
}

export function formatToolOptions<TToolOptions extends ToolOptions>(
  toolOptions: TToolOptions,
  power: ReasoningPower
): TToolOptions;

export function formatToolOptions(toolOptions: ToolOptions, power: ReasoningPower) {
  return {
    ...toolOptions,
    tools: toolOptions.tools
      ? Object.fromEntries(
          Object.entries(toolOptions.tools).map(([key, value]) => {
            if (power === 'low' && key === 'reason') {
              return ['next', NEXT_TOOL];
            }
            return [key, value];
          })
        )
      : toolOptions.tools,
  };
}
