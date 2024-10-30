/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCall } from './tools';

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

interface MessageBase<TRole extends MessageRole> {
  role: TRole;
}

export type UserMessage = MessageBase<MessageRole.User> & { content: string };

export type AssistantMessage = MessageBase<MessageRole.Assistant> & {
  content: string | null;
  toolCalls?: Array<ToolCall<string, Record<string, any> | undefined>>;
};

export type ToolMessage<TToolResponse extends Record<string, any> | unknown> =
  MessageBase<MessageRole.Tool> & {
    toolCallId: string;
    response: TToolResponse;
  };

export type Message = UserMessage | AssistantMessage | ToolMessage<unknown>;
