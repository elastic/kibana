/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import type { ToolCall, ToolData, ToolOptions, ToolResponse } from './tools';
import type { ToolCallsOfToolOptions, ToolNamesOf } from './tools_of';

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
export type AssistantMessage<TToolCalls extends ToolCall[] | undefined = ToolCall[] | undefined> =
  MessageBase<MessageRole.Assistant> & {
    /**
     * The text content of the message.
     * Can be null if the LLM called a tool.
     */
    content: string | null;
    /**
     * Optional refusal reason returned by the model when content is filtered.
     */
    refusal?: string | null;
    // make sure `toolCalls` inherits the optionality from `TToolCalls`
  } & (TToolCalls extends ToolCall[]
      ? {
          /**
           * A potential list of {@ToolCall} the LLM asked to execute.
           * Note that LLM with parallel tool invocation can potentially call multiple tools at the same time.
           */
          toolCalls: TToolCalls;
        }
      : { toolCalls?: TToolCalls });

/**
 * Represents a tool invocation result, following a request from the LLM to execute a tool.
 */
export type ToolMessage<
  TName extends string = string,
  TToolResponse extends ToolResponse = ToolResponse,
  TToolData extends ToolData | undefined = ToolData | undefined
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
  // make sure `data` inherits the optionality of `TToolData`
} & (TToolData extends ToolData ? { data: TToolData } : { data?: TToolData });

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
export type AssistantMessageOf<TToolOptions extends ToolOptions> = AssistantMessage<
  ToolCallsOfToolOptions<TToolOptions>
>;

/**
 * Shape for tool responses
 */
export type ToolResponses = Record<string, ToolResponse>;

/**
 * Utility type to get the Tool message type of a {@link ToolOptions} type.
 */
export type ToolMessageOf<
  TToolOptions extends ToolOptions,
  TToolResponses extends ToolResponses = ToolResponses
> = ValuesType<{
  [key in ToolNamesOf<TToolOptions>]: ToolMessage<key, TToolResponses[key], any>;
}>;

/**
 * Utility type to get the mixin Message type of a {@link ToolOptions} type.
 */
export type MessageOf<
  TToolOptions extends ToolOptions,
  TToolResponses extends Record<ToolNamesOf<TToolOptions>, any> = Record<
    ToolNamesOf<TToolOptions>,
    unknown
  >
> = UserMessage | AssistantMessageOf<TToolOptions> | ToolMessageOf<TToolOptions, TToolResponses>;
