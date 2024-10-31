/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCall } from './tools';

/**
 * Enum for all possible {@link Message} roles.
 */
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

/**
 * Base type for all subtypes of {@link Message}.
 */
interface MessageBase<TRole extends MessageRole> {
  role: TRole;
}

/**
 * Represents a message from the user.
 */
export type UserMessage = MessageBase<MessageRole.User> & {
  /**
   * The text content of the user message
   */
  content: string;
};

/**
 * Represents a message from the LLM.
 */
export type AssistantMessage = MessageBase<MessageRole.Assistant> & {
  /**
   * The text content of the message.
   * Can be null if the LLM called a tool.
   */
  content: string | null;
  /**
   * A potential list of {@ToolCall} the LLM asked to execute.
   * Note that LLM with parallel tool invocation can potentially call multiple tools at the same time.
   */
  toolCalls?: ToolCall[];
};

/**
 * Represents a tool invocation result, following a request from the LLM to execute a tool.
 */
export type ToolMessage<TToolResponse extends Record<string, any> | unknown> =
  MessageBase<MessageRole.Tool> & {
    /**
     * The call id matching the {@link ToolCall} this tool message is for.
     */
    toolCallId: string;
    /**
     * The response from the tool invocation.
     */
    response: TToolResponse;
  };

/**
 * Mixin composed of all the possible types of messages in a chatComplete discussion.
 *
 * Message can be of three types:
 * - {@link UserMessage}
 * - {@link AssistantMessage}
 * - {@link ToolMessage}
 */
export type Message = UserMessage | AssistantMessage | ToolMessage<unknown>;
