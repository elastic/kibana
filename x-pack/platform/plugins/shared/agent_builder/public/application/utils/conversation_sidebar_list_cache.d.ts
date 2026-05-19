import type { QueryClient } from '@kbn/react-query';
export declare const insertSidebarConversationListRow: ({ queryClient, agentId, conversationId, title, }: {
    queryClient: QueryClient;
    agentId: string;
    conversationId: string;
    title: string;
}) => Promise<boolean>;
export declare const removeSidebarConversationListRow: ({ queryClient, agentId, conversationId, }: {
    queryClient: QueryClient;
    agentId: string;
    conversationId: string;
}) => void;
/**
 * Patch the title of a single sidebar list row.
 *
 * Called by `onConversationCreated` when the chat stream emits the
 * `conversation_created` event and we receive the server-generated title that replaces
 * the placeholder "New conversation" set by `insertSidebarConversationListRow`.
 */
export declare const patchSidebarConversationListTitle: ({ queryClient, agentId, conversationId, title, }: {
    queryClient: QueryClient;
    agentId: string;
    conversationId: string;
    title: string;
}) => void;
