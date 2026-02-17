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
import type { Message, ToolOptions, InferenceConnector } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { OpenAiProviderType } from './types';

/**
 * Recursively processes a schema to ensure all array types have an `items` property.
 * OpenAI requires `items` to be present for array types.
 */
function ensureArrayItems(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  const result = { ...schema };

  if (result.type === 'array' && !('items' in result)) {
    result.items = {};
  }

  if (result.items && typeof result.items === 'object') {
    result.items = ensureArrayItems(result.items as Record<string, unknown>);
  }

  if (result.properties && typeof result.properties === 'object') {
    const properties = result.properties as Record<string, unknown>;
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        ensureArrayItems(value as Record<string, unknown>),
      ])
    );
  }

  return result;
}

export function toolsToOpenAI(
  tools: ToolOptions['tools']
): OpenAI.ChatCompletionCreateParams['tools'] {
  return tools
    ? Object.entries(tools).map(([toolName, { description, schema }]) => {
        const parameters = schema ?? {
          type: 'object' as const,
          properties: {},
        };
        return {
          type: 'function',
          function: {
            name: toolName,
            description,
            parameters: ensureArrayItems(
              parameters as unknown as Record<string, unknown>
            ) as unknown as Record<string, unknown>,
          },
        };
      })
    : undefined;
}

export function toolChoiceToOpenAI(
  toolChoice: ToolOptions['toolChoice'],
  context?: { connector?: InferenceConnector; tools?: ToolOptions['tools'] }
): OpenAI.ChatCompletionCreateParams['tool_choice'] {
  // Base mapping
  const mapped =
    typeof toolChoice === 'string'
      ? toolChoice
      : toolChoice
      ? {
          function: {
            name: toolChoice.function,
          },
          type: 'function' as const,
        }
      : undefined;

  // For OpenAI-compatible ("Other") providers:
  // - When native tool calling is enabled (enableNativeFunctionCalling), and
  // - There is exactly one tool defined, and
  // - The caller explicitly selected that same tool by name (named toolChoice),
  // some providers expect `tool_choice: 'required'` instead of the named-function variant.
  // In that case, return 'required' to ensure the tool is invoked natively.
  if (mapped && context?.connector && context?.tools) {
    const isOtherProvider =
      (context.connector.config?.apiProvider as OpenAiProviderType) === OpenAiProviderType.Other;

    const isNativeToolCallingEnabled =
      context.connector.config?.enableNativeFunctionCalling === true;

    if (isOtherProvider && isNativeToolCallingEnabled) {
      const toolNames = Object.keys(context.tools);
      if (toolNames.length === 1 && typeof toolChoice !== 'string' && toolChoice) {
        const selectedTool = toolChoice.function;
        if (selectedTool === toolNames[0]) {
          return 'required';
        }
      }
    }
  }

  return mapped;
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
