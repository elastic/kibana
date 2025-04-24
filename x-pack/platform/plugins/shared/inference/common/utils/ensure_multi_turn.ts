/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '@kbn/inference-common';

type MessageRoleSequenceResult =
  | {
      roleSequenceValid: true;
    }
  | {
      roleSequenceValid: false;
      intermediaryRole: MessageRole.User | MessageRole.Assistant;
    };

/**
 * Two consecutive messages with USER role or two consecutive messages with ASSISTANT role are not allowed.
 * Consecutive messages with TOOL role are allowed.
 */
function checkMessageRoleSequenceValid(
  prevMessage: Message | undefined,
  message: Message
): MessageRoleSequenceResult {
  if (!prevMessage) {
    return {
      roleSequenceValid: true,
    };
  }

  if (prevMessage.role === MessageRole.User && message.role === MessageRole.User) {
    return {
      roleSequenceValid: false,
      intermediaryRole: MessageRole.Assistant,
    };
  }
  if (prevMessage.role === MessageRole.Assistant && message.role === MessageRole.Assistant) {
    return {
      roleSequenceValid: false,
      intermediaryRole: MessageRole.User,
    };
  }
  if (prevMessage.role === MessageRole.Tool && message.role === MessageRole.Tool) {
    return {
      roleSequenceValid: true,
    };
  }

  return {
    roleSequenceValid: true,
  };
}

export function ensureMultiTurn(messages: Message[]): Message[] {
  const next: Message[] = [];

  messages.forEach((message) => {
    const prevMessage = next[next.length - 1];

    const result = checkMessageRoleSequenceValid(prevMessage, message);
    if (!result.roleSequenceValid) {
      next.push({
        content: '-',
        role: result.intermediaryRole,
      });
    }

    next.push(message);
  });

  return next;
}
