interface UseConversationListMutationsParams {
    routeConversationId: string | undefined;
}
export declare const useConversationListMutations: ({ routeConversationId, }: UseConversationListMutationsParams) => {
    deleteConversation: (conversationId: string) => Promise<void>;
    renameConversation: (conversationId: string, title: string) => Promise<void>;
};
export {};
