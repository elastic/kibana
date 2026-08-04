import type { QueryClient } from '@kbn/react-query';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { ConversationsService } from '../../services/conversations/conversations_service';
export declare const insertSidebarConversationListRow: ({ queryClient, conversationsService, agentId, conversationId, title, }: {
    queryClient: QueryClient;
    conversationsService: ConversationsService;
    agentId: string;
    conversationId: string;
    title: string;
}) => Promise<boolean>;
export declare const removeSidebarConversationListRow: ({ queryClient, agentId, conversationId, }: {
    queryClient: QueryClient;
    agentId: string;
    conversationId: string;
}) => void;
export declare const patchConversationList: ({ queryClient, agentId, conversationId, values, }: {
    queryClient: QueryClient;
    agentId: string;
    conversationId: string;
    values: Partial<ConversationWithoutRounds>;
}) => void;
