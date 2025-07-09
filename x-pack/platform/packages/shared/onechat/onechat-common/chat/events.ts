/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatEvent } from '../base/events';
import type { ChatAgentEvent } from '../agents';

export enum ChatEventType {
  conversationCreated = 'conversation_created',
  conversationUpdated = 'conversation_updated',
}

export type ChatEventBase<
  TEventType extends ChatEventType,
  TData extends Record<string, any>
> = OnechatEvent<TEventType, TData>;

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

/**
 * All types of events that can be emitted from the chat API.
 */
export type ChatEvent = ChatAgentEvent | ConversationCreatedEvent | ConversationUpdatedEvent;
