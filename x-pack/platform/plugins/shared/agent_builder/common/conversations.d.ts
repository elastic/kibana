import type { Conversation } from '@kbn/agent-builder-common';
export type ConversationCreateRequest = Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'user'> & {
    id?: string;
};
export interface ConversationListOptions {
    agentId?: string;
}
export interface ConversationGetOptions {
    conversationId: string;
}
export interface ConversationDeleteOptions {
    conversationId: string;
}
