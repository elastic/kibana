import type { ConversationCreatedEvent, ConversationUpdatedEvent, Conversation, ConversationIdSetEvent } from '@kbn/agent-builder-common';
export declare const createConversationCreatedEvent: (conversation: Conversation) => ConversationCreatedEvent;
export declare const createConversationUpdatedEvent: (conversation: Conversation) => ConversationUpdatedEvent;
export declare const createConversationIdSetEvent: (conversationId: string) => ConversationIdSetEvent;
