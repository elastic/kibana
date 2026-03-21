import type { Observable } from 'rxjs';
import type { Conversation, RoundCompleteEvent, ConversationAction } from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
/**
 * Persist a new conversation and emit the corresponding event
 */
export declare const createConversation$: ({ agentId, conversationClient, conversationId, title$, roundCompletedEvents$, }: {
    agentId: string;
    conversationClient: ConversationClient;
    conversationId?: string;
    title$: Observable<string>;
    roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => Observable<import("@kbn/agent-builder-common").ConversationCreatedEvent>;
/**
 * Update an existing conversation and emit the corresponding event
 */
export declare const updateConversation$: ({ conversationClient, conversation, title$, roundCompletedEvents$, action, }: {
    conversation: Conversation;
    title$: Observable<string>;
    roundCompletedEvents$: Observable<RoundCompleteEvent>;
    conversationClient: ConversationClient;
    action?: ConversationAction;
}) => Observable<import("@kbn/agent-builder-common").ConversationUpdatedEvent>;
/**
 * Check if a conversation exists
 */
export declare const conversationExists: ({ conversationId, conversationClient, }: {
    conversationId: string;
    conversationClient: ConversationClient;
}) => Promise<boolean>;
export type ConversationOperation = 'CREATE' | 'UPDATE';
export type ConversationWithOperation = Conversation & {
    operation: ConversationOperation;
};
/**
 * Get a conversation by ID, or create a placeholder for new conversations.
 * Determines the operation type (CREATE or UPDATE) based on conversationId presence.
 * Note: Validation and manipulation for regenerate is handled in runDefaultAgentMode.
 */
export declare const getConversation: ({ agentId, conversationId, autoCreateConversationWithId, conversationClient, }: {
    agentId: string;
    conversationId: string | undefined;
    autoCreateConversationWithId?: boolean;
    conversationClient: ConversationClient;
}) => Promise<ConversationWithOperation>;
export declare const placeholderConversation: ({ agentId, conversationId, }: {
    agentId: string;
    conversationId?: string;
}) => Conversation;
