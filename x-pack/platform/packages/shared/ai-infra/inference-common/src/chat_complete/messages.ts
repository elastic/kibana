/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCall, ToolCallsOf, ToolNamesOf, ToolOptions, ToolResponsesOf } from './tools';

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

export interface MessageContentText {
  type: 'text';
  text: string;
}

export interface MessageContentImage {
  type: 'image';
  source: { data: string; mimeType: string };
}

export type MessageContent = string | Array<MessageContentText | MessageContentImage>;

/**
 * Represents a message from the user.
 */
export type UserMessage = MessageBase<MessageRole.User> & {
  /**
   * The text or image content of the user message
   */
  content: MessageContent;
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
export type ToolMessage<
  TName extends string = string,
  TToolResponse extends Record<string, any> | unknown = Record<string, any> | unknown,
  TToolData extends Record<string, any> | undefined = Record<string, any> | undefined
> = MessageBase<MessageRole.Tool> & {
  /**
   * The name of the tool called. Used for refining the type of the response.
   */
  name: TName;
  /**
   * The call id matching the {@link ToolCall} this tool message is for.
   */
  toolCallId: string;
  /**
   * The response from the tool invocation.
   */
  response: TToolResponse;
} & (TToolData extends undefined
    ? {}
    : {
        /**
         * Additional data from the tool invocation, that is not sent to the LLM
         * but can be used to attach baggage (such as timeseries or debug data)
         */
        data: TToolData;
      });

/**
 * Mixin composed of all the possible types of messages in a chatComplete discussion.
 *
 * Message can be of three types:
 * - {@link UserMessage}
 * - {@link AssistantMessage}
 * - {@link ToolMessage}
 */
export type Message = UserMessage | AssistantMessage | ToolMessage;

/**
 * Utility type to get the Assistant message type of a {@link ToolOptions} type.
 */
export type AssistantMessageOf<TToolOptions extends ToolOptions> = Omit<
  AssistantMessage,
  'toolCalls'
> &
  ToolCallsOf<TToolOptions>;

/**
 * Utility type to get the Tool message type of a {@link ToolOptions} type.
 */

export type ToolMessageOf<TToolOptions extends ToolOptions> = ToolMessage<
  ToolNamesOf<TToolOptions>,
  ToolResponsesOf<TToolOptions['tools']>
>;

/**
 * Utility type to get the mixin Message type of a {@link ToolOptions} type.
 */
export type MessageOf<TToolOptions extends ToolOptions> =
  | UserMessage
  | AssistantMessageOf<TToolOptions>
  | ToolMessageOf<TToolOptions>;
