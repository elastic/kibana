/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionMessageEvent } from '@kbn/inference-common';
import { type Message, MessageRole } from '../../../common/types';

// TODO: to use in redactMessages when we update NER to work with JSON string
export function getRedactableMessageParts(message: Message) {
  if (message.message.role === MessageRole.Assistant) {
    return {
      // we might want to consider not running detection on assistant responses (content)
      // as they're already coming from the LLM
      content: message.message.content,
      function_call: message.message.function_call?.arguments,
    };
  }

  return {
    content: message.message.content,
  };
}
export function getRedactableMessageEventParts(event: ChatCompletionMessageEvent) {
  return {
    content: event.content,
    toolCalls: event.toolCalls?.map((toolCall) => ({
      function: toolCall.function,
    })),
  };
}
