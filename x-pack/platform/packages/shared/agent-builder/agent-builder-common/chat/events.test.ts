/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
  isPlanCreatedEvent,
  isPlanUpdatedEvent,
  isModeSuggestionEvent,
  ChatEventType,
} from './events';
import type { AgentBuilderEvent } from '../base/events';

describe('Chat events', () => {
  describe('isPlanCreatedEvent', () => {
    it('returns true for plan_created events', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.planCreated,
        data: { plan: {} },
      };
      expect(isPlanCreatedEvent(event)).toBe(true);
    });

    it('returns false for other event types', () => {
      const planUpdatedEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.planUpdated,
        data: { plan: {} },
      };
      expect(isPlanCreatedEvent(planUpdatedEvent)).toBe(false);

      const messageChunkEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.messageChunk,
        data: { message_id: 'msg-1', text_chunk: 'hello' },
      };
      expect(isPlanCreatedEvent(messageChunkEvent)).toBe(false);
    });
  });

  describe('isPlanUpdatedEvent', () => {
    it('returns true for plan_updated events', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.planUpdated,
        data: { plan: {} },
      };
      expect(isPlanUpdatedEvent(event)).toBe(true);
    });

    it('returns false for other event types', () => {
      const planCreatedEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.planCreated,
        data: { plan: {} },
      };
      expect(isPlanUpdatedEvent(planCreatedEvent)).toBe(false);

      const modeSuggestionEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.modeSuggestion,
        data: { suggested_mode: 'planning', reason: 'test' },
      };
      expect(isPlanUpdatedEvent(modeSuggestionEvent)).toBe(false);
    });
  });

  describe('isModeSuggestionEvent', () => {
    it('returns true for mode_suggestion events', () => {
      const event: AgentBuilderEvent<string, any> = {
        type: ChatEventType.modeSuggestion,
        data: { suggested_mode: 'planning', reason: 'User asked to plan' },
      };
      expect(isModeSuggestionEvent(event)).toBe(true);
    });

    it('returns false for other event types', () => {
      const planCreatedEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.planCreated,
        data: { plan: {} },
      };
      expect(isModeSuggestionEvent(planCreatedEvent)).toBe(false);

      const messageChunkEvent: AgentBuilderEvent<string, any> = {
        type: ChatEventType.messageChunk,
        data: { message_id: 'msg-1', text_chunk: 'hello' },
      };
      expect(isModeSuggestionEvent(messageChunkEvent)).toBe(false);
    });
  });

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
});
