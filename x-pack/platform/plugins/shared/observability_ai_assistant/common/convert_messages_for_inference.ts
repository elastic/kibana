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
import { redactEntities } from './utils/redaction';

function safeJsonParse(jsonString: string | undefined, logger: Pick<Logger, 'error'>) {
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

export function convertMessagesForInference(
  messages: Message[],
  logger: Pick<Logger, 'error'>
): InferenceMessage[] {
  const inferenceMessages: InferenceMessage[] = [];

  messages.forEach((message) => {
    if (message.message.role === MessageRole.Assistant) {
      let assistantContent = message.message.content ?? null;
      // Stored assistant content is un‑redacted, so reapply hashes here
      // before sending the history back to the LLM.
      if (message.message.detected_entities?.length && assistantContent) {
        assistantContent = redactEntities(assistantContent, message.message.detected_entities);
      }

      // Reapply redaction inside function_call.arguments JSON, if any
      let toolCalls;
      if (message.message.function_call?.name) {
        const functionArgs = message.message.function_call.arguments;
        const detectedEntities = message.message.detected_entities;
        // Replace any entity values with their hashes
        const redactedArgs =
          detectedEntities && functionArgs
            ? redactEntities(functionArgs, detectedEntities)
            : functionArgs;
        const parsedArgs = safeJsonParse(redactedArgs, logger);

        toolCalls = [
          {
            function: {
              name: message.message.function_call.name,
              arguments: parsedArgs,
            },
            toolCallId: generateFakeToolCallId(),
          },
        ];
      }

      inferenceMessages.push({
        role: InferenceMessageRole.Assistant,
        content: assistantContent ?? null,
        ...(toolCalls ? { toolCalls } : {}),
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
      if (message.message.detected_entities && message.message.detected_entities.length > 0) {
        contentWithToolCallForInference = redactEntities(
          message.message.content ?? '',
          message.message.detected_entities
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
      // If detectedEntities exist, remove them
      if (message.message.detected_entities && message.message.detected_entities.length > 0) {
        contentForInference = redactEntities(
          contentForInference,
          message.message.detected_entities
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
