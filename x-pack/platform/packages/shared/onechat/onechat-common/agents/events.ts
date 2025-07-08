/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatEvent } from '../base/events';
import type { ConversationRound } from '../chat';
import type { PlainIdToolIdentifier } from '../tools/tools';

export enum ChatAgentEventType {
  toolCall = 'tool_call',
  toolResult = 'tool_result',
  reasoning = 'reasoning',
  messageChunk = 'message_chunk',
  messageComplete = 'message_complete',
  roundComplete = 'round_complete',
}

export type ChatAgentEventBase<
  TEventType extends ChatAgentEventType,
  TData extends Record<string, any>
> = OnechatEvent<TEventType, TData>;

// Tool call

export interface ToolCallEventData {
  tool_call_id: string;
  tool_id: PlainIdToolIdentifier;
  tool_type: string;
  params: Record<string, unknown>;
}

export type ToolCallEvent = ChatAgentEventBase<ChatAgentEventType.toolCall, ToolCallEventData>;

export const isToolCallEvent = (event: OnechatEvent<string, any>): event is ToolCallEvent => {
  return event.type === ChatAgentEventType.toolCall;
};

// Tool result

export interface ToolResultEventData {
  tool_call_id: string;
  tool_id: PlainIdToolIdentifier;
  tool_type: string;
  result: string;
}

export type ToolResultEvent = ChatAgentEventBase<
  ChatAgentEventType.toolResult,
  ToolResultEventData
>;

export const isToolResultEvent = (event: OnechatEvent<string, any>): event is ToolResultEvent => {
  return event.type === ChatAgentEventType.toolResult;
};

// reasoning

export interface ReasoningEventData {
  reasoning: string;
}

export type ReasoningEvent = ChatAgentEventBase<ChatAgentEventType.reasoning, ReasoningEventData>;

export const isReasoningEvent = (event: OnechatEvent<string, any>): event is ReasoningEvent => {
  return event.type === ChatAgentEventType.reasoning;
};

// Message chunk

export interface MessageChunkEventData {
  /** ID of the message this chunk is bound to */
  message_id: string;
  /** chunk (text delta) */
  text_chunk: string;
}

export type MessageChunkEvent = ChatAgentEventBase<
  ChatAgentEventType.messageChunk,
  MessageChunkEventData
>;

export const isMessageChunkEvent = (
  event: OnechatEvent<string, any>
): event is MessageChunkEvent => {
  return event.type === ChatAgentEventType.messageChunk;
};

// Message complete

export interface MessageCompleteEventData {
  /** ID of the message */
  message_id: string;
  /** full text content of the message */
  message_content: string;
}

export type MessageCompleteEvent = ChatAgentEventBase<
  ChatAgentEventType.messageComplete,
  MessageCompleteEventData
>;

export const isMessageCompleteEvent = (
  event: OnechatEvent<string, any>
): event is MessageCompleteEvent => {
  return event.type === ChatAgentEventType.messageComplete;
};

// Round complete

export interface RoundCompleteEventData {
  /** round that was completed */
  round: ConversationRound;
}

export type RoundCompleteEvent = ChatAgentEventBase<
  ChatAgentEventType.roundComplete,
  RoundCompleteEventData
>;

export const isRoundCompleteEvent = (
  event: OnechatEvent<string, any>
): event is RoundCompleteEvent => {
  return event.type === ChatAgentEventType.roundComplete;
};

// Composite type of all chat events

export type ChatAgentEvent =
  | ToolCallEvent
  | ToolResultEvent
  | ReasoningEvent
  | MessageChunkEvent
  | MessageCompleteEvent
  | RoundCompleteEvent;
