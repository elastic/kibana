/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssistantMessage,
  Message as InferenceMessage,
  MessageRole as InferenceMessageRole,
} from '@kbn/inference-common';
import { generateFakeToolCallId } from '@kbn/inference-plugin/common';
import type { Logger } from '@kbn/logging';
import { Message, MessageRole } from '.';
import { NerEntity } from './types';

function safeJsonParse(jsonString: string | undefined, logger: Pick<Logger, 'error'>) {
  try {
    return JSON.parse(jsonString ?? '{}');
  } catch (error) {
    logger.error(
      `Failed to parse function call arguments when converting messages for inference: ${error}`
    );
    // if the LLM returns invalid JSON, it is likley because it is hallucinating
    // the function. We don't want to propogate the error about invalid JSON here.
    // Any errors related to the function call will be caught when the function and
    // it's arguments are validated
    return {};
  }
}

function redactEntities(original: string, entities: NerEntity[]): string {
  const sortedEntities = entities.slice().sort((a, b) => a.start_pos - b.start_pos);
  let redacted = '';
  let currentIndex = 0;
  for (const ent of sortedEntities) {
    redacted += original.substring(currentIndex, ent.start_pos);
    redacted += `${ent.hash}`;
    currentIndex = ent.end_pos;
  }
  redacted += original.substring(currentIndex);
  return redacted;
}

export function convertMessagesForInference(
  messages: Message[],
  logger: Pick<Logger, 'error'>
): InferenceMessage[] {
  const inferenceMessages: InferenceMessage[] = [];

  messages.forEach((message) => {
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
                    arguments: safeJsonParse(message.message.function_call.arguments, logger),
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
      let contentWithToolCallForInference = message.message.content ?? '';
      if (message.message.nerEntities && message.message.nerEntities.length > 0) {
        contentWithToolCallForInference = redactEntities(
          message.message.content ?? '',
          message.message.nerEntities
        );
      }

      inferenceMessages.push({
        name: message.message.name!,
        role: InferenceMessageRole.Tool,
        response: JSON.parse(contentWithToolCallForInference),
        toolCallId: toolCallRequest.toolCalls![0].toolCallId,
      });

      return;
    }

    if (isUserMessage) {
      let contentForInference = message.message.content ?? '';
      // If nerEntities exist, remove them
      if (message.message.nerEntities && message.message.nerEntities.length > 0) {
        contentForInference = redactEntities(
          message.message.content ?? '',
          message.message.nerEntities
        );
      }
      inferenceMessages.push({
        role: InferenceMessageRole.User,
        content: contentForInference,
      });
      return;
    }

    throw new Error(`Unsupported message type: ${message.message.role}`);
  });

  return inferenceMessages;
}
