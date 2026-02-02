/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConversationUpdatedEvent, isConversationCreatedEvent, ChatEventType } from './events';
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
});
