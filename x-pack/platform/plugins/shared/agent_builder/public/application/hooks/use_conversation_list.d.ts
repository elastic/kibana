export declare const useConversationList: ({ agentId }?: {
    agentId?: string;
}) => {
    conversations: import("@kbn/agent-builder-common").ConversationWithoutRounds[] | undefined;
    isLoading: boolean;
    refresh: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<import("@kbn/agent-builder-common").ConversationWithoutRounds[], unknown>>;
};
