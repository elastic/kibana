/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '@kbn/inference-common';

export function getAnonymizableMessageParts(message: Message) {
  if (message.role === MessageRole.Tool) {
    return {
      response: message.response,
    };
  }

  if (message.role === MessageRole.Assistant) {
    return {
      content: message.content,
      toolCalls: message.toolCalls?.map((toolCall) => {
        return {
          function: toolCall.function,
        };
      }),
    };
  }

  return {
    content: message.content,
  };
}
