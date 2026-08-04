import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
export interface ListConversationsResponse {
    results: ConversationWithoutRounds[];
}
export interface DeleteConversationResponse {
    success: boolean;
}
export interface RenameConversationResponse {
    id: string;
    title: string;
}
export interface MarkReadConversationResponse {
    id: string;
    read: boolean;
}
