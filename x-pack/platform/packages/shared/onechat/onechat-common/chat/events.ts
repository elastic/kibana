/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatEvent } from '../base/events';
import type { ToolResult } from '../tools/tool_result';
import type { ConversationRound } from './conversation';

export enum ChatEventType {
  toolCall = 'tool_call',
  toolProgress = 'tool_progress',
  toolResult = 'tool_result',
  reasoning = 'reasoning',
  messageChunk = 'message_chunk',
  messageComplete = 'message_complete',
  roundComplete = 'round_complete',
  conversationCreated = 'conversation_created',
  conversationUpdated = 'conversation_updated',
  conversationIdSet = 'conversation_id_set',
}

export type ChatEventBase<
  TEventType extends ChatEventType,
  TData extends Record<string, any>
> = OnechatEvent<TEventType, TData>;

// Tool call

export interface ToolCallEventData {
  tool_call_id: string;
  tool_id: string;
  params: Record<string, unknown>;
}

export type ToolCallEvent = ChatEventBase<ChatEventType.toolCall, ToolCallEventData>;

export const isToolCallEvent = (event: OnechatEvent<string, any>): event is ToolCallEvent => {
  return event.type === ChatEventType.toolCall;
};

// Tool progress

export interface ToolProgressEventData {
  tool_call_id: string;
  message: string;
}

export type ToolProgressEvent = ChatEventBase<ChatEventType.toolProgress, ToolProgressEventData>;

export const isToolProgressEvent = (
  event: OnechatEvent<string, any>
): event is ToolProgressEvent => {
  return event.type === ChatEventType.toolProgress;
};

// Tool result

export interface ToolResultEventData {
  tool_call_id: string;
  tool_id: string;
  results: ToolResult[];
}

export type ToolResultEvent = ChatEventBase<ChatEventType.toolResult, ToolResultEventData>;

export const isToolResultEvent = (event: OnechatEvent<string, any>): event is ToolResultEvent => {
  return event.type === ChatEventType.toolResult;
};

// reasoning

export interface ReasoningEventData {
  reasoning: string;
}

export type ReasoningEvent = ChatEventBase<ChatEventType.reasoning, ReasoningEventData>;

export const isReasoningEvent = (event: OnechatEvent<string, any>): event is ReasoningEvent => {
  return event.type === ChatEventType.reasoning;
};

// Message chunk

export interface MessageChunkEventData {
  /** ID of the message this chunk is bound to */
  message_id: string;
  /** chunk (text delta) */
  text_chunk: string;
}

export type MessageChunkEvent = ChatEventBase<ChatEventType.messageChunk, MessageChunkEventData>;

export const isMessageChunkEvent = (
  event: OnechatEvent<string, any>
): event is MessageChunkEvent => {
  return event.type === ChatEventType.messageChunk;
};

// Message complete

export interface MessageCompleteEventData {
  /** ID of the message */
  message_id: string;
  /** full text content of the message */
  message_content: string;
}

export type MessageCompleteEvent = ChatEventBase<
  ChatEventType.messageComplete,
  MessageCompleteEventData
>;

export const isMessageCompleteEvent = (
  event: OnechatEvent<string, any>
): event is MessageCompleteEvent => {
  return event.type === ChatEventType.messageComplete;
};

// Round complete

export interface RoundCompleteEventData {
  /** round that was completed */
  round: ConversationRound;
}

export type RoundCompleteEvent = ChatEventBase<ChatEventType.roundComplete, RoundCompleteEventData>;

export const isRoundCompleteEvent = (
  event: OnechatEvent<string, any>
): event is RoundCompleteEvent => {
  return event.type === ChatEventType.roundComplete;
};

// conversation created

export interface ConversationCreatedEventData {
  conversation_id: string;
  title: string;
}

export type ConversationCreatedEvent = ChatEventBase<
  ChatEventType.conversationCreated,
  ConversationCreatedEventData
>;

export const isConversationCreatedEvent = (
  event: OnechatEvent<string, any>
): event is ConversationCreatedEvent => {
  return event.type === ChatEventType.conversationCreated;
};

// conversation updated

export interface ConversationUpdatedEventData {
  conversation_id: string;
  title: string;
}

export type ConversationUpdatedEvent = ChatEventBase<
  ChatEventType.conversationUpdated,
  ConversationUpdatedEventData
>;

export const isConversationUpdatedEvent = (
  event: OnechatEvent<string, any>
): event is ConversationUpdatedEvent => {
  return event.type === ChatEventType.conversationUpdated;
};

// conversation id set

export interface ConversationIdSetEventData {
  conversation_id: string;
}

export type ConversationIdSetEvent = ChatEventBase<
  ChatEventType.conversationIdSet,
  ConversationIdSetEventData
>;

export const isConversationIdSetEvent = (
  event: OnechatEvent<string, any>
): event is ConversationIdSetEvent => {
  return event.type === ChatEventType.conversationIdSet;
};

/**
 * All types of events that can be emitted from an agent execution.
 */
export type ChatAgentEvent =
  | ToolCallEvent
  | ToolProgressEvent
  | ToolResultEvent
  | ReasoningEvent
  | MessageChunkEvent
  | MessageCompleteEvent
  | RoundCompleteEvent;

/**
 * All types of events that can be emitted from the chat API.
 */
export type ChatEvent =
  | ChatAgentEvent
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | ConversationIdSetEvent;
