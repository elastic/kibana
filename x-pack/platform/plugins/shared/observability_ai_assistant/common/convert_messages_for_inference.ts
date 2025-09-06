/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantMessage, Message as InferenceMessage } from '@kbn/inference-common';
import { MessageRole as InferenceMessageRole } from '@kbn/inference-common';
import { generateFakeToolCallId } from '@kbn/inference-plugin/common';
import type { Logger } from '@kbn/logging';
import { takeWhile } from 'lodash';
import type { Message } from '.';
import { MessageRole } from '.';

export function safeJsonParse(jsonString: string | undefined) {
  try {
    return JSON.parse(jsonString?.trim() ?? '{}');
  } catch (error) {
    // if the LLM returns invalid JSON, it is likley because it is hallucinating
    // the function. We don't want to propogate the error about invalid JSON here.
    // Any errors related to the function call will be caught when the function and
    // it's arguments are validated
    return {};
  }
}

export function collapseInternalToolCalls(
  messages: Message[],
  availableToolNames: string[],
  logger: Logger
) {
  const collapsedMessages: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i];

    const messagesToCollapse = takeWhile(messages.slice(i + 1), (msg) => {
      const toolCall =
        msg.message.role === MessageRole.Assistant &&
        msg.message.function_call?.name &&
        !availableToolNames.includes(msg.message.function_call?.name);

      const toolResult =
        msg.message.role === MessageRole.User &&
        msg.message.name &&
        !availableToolNames.includes(msg.message.name);

      return toolCall || toolResult;
    });

    if (messagesToCollapse.length) {
      if (currentMessage?.message.role === MessageRole.User) {
        const isToolResult = !!currentMessage.message.name;
        if (isToolResult) {
          const content = JSON.parse(currentMessage.message.content!);
          collapsedMessages.push({
            ...currentMessage,
            message: {
              ...currentMessage.message,
              content: JSON.stringify({
                ...content,
                steps: convertMessagesForInference(messagesToCollapse, availableToolNames, logger),
              }),
            },
          });
        } else {
          const content = currentMessage.message.content!;
          collapsedMessages.push({
            ...currentMessage,
            message: {
              ...currentMessage.message,
              content: `${content} <steps>${JSON.stringify(
                convertMessagesForInference(messagesToCollapse, availableToolNames, logger)
              )}</steps>`,
            },
          });
        }
      }

      // skip the collapsed messages
      i += messagesToCollapse.length;
    } else {
      collapsedMessages.push(currentMessage);
    }
  }

  return collapsedMessages;
}

export function convertMessagesForInference(
  messages: Message[],
  availableToolNames: string[],
  logger: Logger
): InferenceMessage[] {
  const inferenceMessages: InferenceMessage[] = [];

  logger.debug(
    `Converting ${messages.length} messages for inference: ${JSON.stringify(messages, null, 2)}`
  );

  const collapsedMessages: Message[] = collapseInternalToolCalls(
    messages,
    availableToolNames,
    logger
  );

  collapsedMessages.forEach((message, idx) => {
    if (message.message.role === MessageRole.Assistant) {
      inferenceMessages.push({
        role: InferenceMessageRole.Assistant,
        content: message.message.content ?? null,
        ...(message.message.function_call?.name
          ? {
              toolCalls: [
                {
                  function: {
                    name: message.message.function_call.name,
                    arguments: safeJsonParse(message.message.function_call.arguments),
                  },
                  toolCallId: generateFakeToolCallId(),
                },
              ],
            }
          : {}),
      });
      return;
    }

    const isUserMessage = message.message.role === MessageRole.User;
    const isUserMessageWithToolCall = isUserMessage && !!message.message.name;

    if (isUserMessageWithToolCall) {
      const toolCallRequest = inferenceMessages.findLast(
        (msg) =>
          msg.role === InferenceMessageRole.Assistant &&
          msg.toolCalls?.[0]?.function.name === message.message.name
      ) as AssistantMessage | undefined;

      if (!toolCallRequest) {
        throw new Error(`Could not find tool call request for ${message.message.name}`);
      }

      inferenceMessages.push({
        name: message.message.name!,
        role: InferenceMessageRole.Tool,
        response: JSON.parse(message.message.content ?? '{}'),
        toolCallId: toolCallRequest.toolCalls![0].toolCallId,
      });

      return;
    }

    if (isUserMessage) {
      inferenceMessages.push({
        role: InferenceMessageRole.User,
        content: message.message.content ?? '',
      });
      return;
    }

    throw new Error(`Unsupported message type: ${message.message.role}`);
  });

  return inferenceMessages;
}
