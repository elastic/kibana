/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
  isApiStateChangedEvent,
  API_STATE_CHANGED_UI_EVENT,
  TODOS_UPDATED_UI_EVENT,
  ChatEventType,
} from './events';
import type { MessageChunkEvent, ToolUiEvent } from './events';
import type { AgentBuilderEvent } from '../base/events';

describe('Chat events', () => {
  describe('isConversationCreatedEvent', () => {
    it('should return true for a conversation created event', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.conversationCreated,
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationCreatedEvent(event)).toBe(true);
    });

    it('should return false for a conversation updated event', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.conversationUpdated,
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationCreatedEvent(event)).toBe(false);
    });

    it('should return false for an unknown event type', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: 'unknownEvent',
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationCreatedEvent(event)).toBe(false);
    });
  });

  describe('isConversationUpdatedEvent', () => {
    it('should return true for a conversation updated event', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.conversationUpdated,
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationUpdatedEvent(event)).toBe(true);
    });

    it('should return false for a conversation created event', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.conversationCreated,
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationUpdatedEvent(event)).toBe(false);
    });

    it('should return false for an unknown event type', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: 'unknownEvent',
        data: {
          conversationId: 'test-conversation',
          title: 'Test Conversation',
        },
      };
      expect(isConversationUpdatedEvent(event)).toBe(false);
    });
  });

  describe('isApiStateChangedEvent', () => {
    const toolUiEvent = (customEvent: string): ToolUiEvent => ({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'execute_api',
        tool_call_id: 'call-1',
        custom_event: customEvent,
        data: { target: 'kibana', api: 'cases.create', method: 'POST', path: '/api/cases' },
      },
    });

    it('should return true for an api state changed tool UI event', () => {
      expect(isApiStateChangedEvent(toolUiEvent(API_STATE_CHANGED_UI_EVENT))).toBe(true);
    });

    it('should return false for another tool UI event', () => {
      expect(isApiStateChangedEvent(toolUiEvent(TODOS_UPDATED_UI_EVENT))).toBe(false);
    });

    it('should return false for a non tool UI event', () => {
      const event: MessageChunkEvent = {
        type: ChatEventType.messageChunk,
        data: { message_id: 'message-1', text_chunk: API_STATE_CHANGED_UI_EVENT },
      };
      expect(isApiStateChangedEvent(event)).toBe(false);
    });
  });
});
