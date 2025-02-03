/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { Message, MessageRole, ToolOptions } from '@kbn/inference-common';

export function toolsToOpenAI(
  tools: ToolOptions['tools']
): OpenAI.ChatCompletionCreateParams['tools'] {
  return tools
    ? Object.entries(tools).map(([toolName, { description, schema }]) => {
        return {
          type: 'function',
          function: {
            name: toolName,
            description,
            parameters: (schema ?? {
              type: 'object' as const,
              properties: {},
            }) as unknown as Record<string, unknown>,
          },
        };
      })
    : undefined;
}

export function toolChoiceToOpenAI(
  toolChoice: ToolOptions['toolChoice']
): OpenAI.ChatCompletionCreateParams['tool_choice'] {
  return typeof toolChoice === 'string'
    ? toolChoice
    : toolChoice
    ? {
        function: {
          name: toolChoice.function,
        },
        type: 'function' as const,
      }
    : undefined;
}

export function messagesToOpenAI({
  system,
  messages,
}: {
  system?: string;
  messages: Message[];
}): OpenAI.ChatCompletionMessageParam[] {
  const systemMessage: ChatCompletionSystemMessageParam | undefined = system
    ? { role: 'system', content: system }
    : undefined;

  return [
    ...(systemMessage ? [systemMessage] : []),
    ...messages.map((message): ChatCompletionMessageParam => {
      const role = message.role;

      switch (role) {
        case MessageRole.Assistant:
          const assistantMessage: ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            content: message.content ?? '',
            tool_calls: message.toolCalls?.map((toolCall) => {
              return {
                function: {
                  name: toolCall.function.name,
                  arguments:
                    'arguments' in toolCall.function
                      ? JSON.stringify(toolCall.function.arguments)
                      : '{}',
                },
                id: toolCall.toolCallId,
                type: 'function',
              };
            }),
          };
          return assistantMessage;

        case MessageRole.User:
          const userMessage: ChatCompletionUserMessageParam = {
            role: 'user',
            content:
              typeof message.content === 'string'
                ? message.content
                : message.content.map((contentPart) => {
                    if (contentPart.type === 'image') {
                      return {
                        type: 'image_url',
                        image_url: {
                          url: contentPart.source.data,
                        },
                      } satisfies ChatCompletionContentPartImage;
                    }
                    return {
                      text: contentPart.text,
                      type: 'text',
                    } satisfies ChatCompletionContentPartText;
                  }),
          };
          return userMessage;

        case MessageRole.Tool:
          const toolMessage: ChatCompletionToolMessageParam = {
            role: 'tool',
            content: JSON.stringify(message.response),
            tool_call_id: message.toolCallId,
          };
          return toolMessage;
      }
    }),
  ];
}
