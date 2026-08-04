interface UseConversationListMutationsParams {
    routeConversationId: string | undefined;
    agentId: string;
}
export declare const useConversationListMutations: ({ routeConversationId, agentId, }: UseConversationListMutationsParams) => {
    deleteConversation: (conversationId: string) => Promise<void>;
    renameConversation: (conversationId: string, title: string) => Promise<void>;
    markAsRead: (conversationId: string) => void;
    markAsUnread: (conversationId: string) => void;
};
export {};
