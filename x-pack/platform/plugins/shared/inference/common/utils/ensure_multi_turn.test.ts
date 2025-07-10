/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantMessage, MessageRole, UserMessage, ToolMessage } from '@kbn/inference-common';
import { ensureMultiTurn } from './ensure_multi_turn';

const assistantMessage: AssistantMessage = {
  role: MessageRole.Assistant,
  content: 'Hello from assistant',
};

const userMessage: UserMessage = {
  role: MessageRole.User,
  content: 'Hello from user',
};

const toolMessage: ToolMessage = {
  role: MessageRole.Tool,
  response: 'Hello from tool',
  toolCallId: '123',
  name: 'toolName',
};

const intermediaryUserMessage: UserMessage = {
  role: MessageRole.User,
  content: '-',
};

const intemediaryAssistantMessage: AssistantMessage = {
  role: MessageRole.Assistant,
  content: '-',
};

describe('ensureMultiTurn', () => {
  it('returns correct value for message sequence', () => {
    const messages = [
      assistantMessage,
      assistantMessage,
      userMessage,
      userMessage,
      toolMessage,
      toolMessage,
      userMessage,
      assistantMessage,
      toolMessage,
    ];

    const result = ensureMultiTurn(messages);

    expect(result).toEqual([
      assistantMessage,
      intermediaryUserMessage,
      assistantMessage,
      userMessage,
      intemediaryAssistantMessage,
      userMessage,
      toolMessage,
      toolMessage,
      userMessage,
      assistantMessage,
      toolMessage,
    ]);
  });
});
