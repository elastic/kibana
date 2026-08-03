export declare const useConversationList: ({ agentId }?: {
    agentId?: string;
}) => {
    conversations: import("@kbn/agent-builder-common").ConversationWithoutRounds[] | undefined;
    isLoading: boolean;
    refresh: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<import("@kbn/agent-builder-common").ConversationWithoutRounds[], unknown>>;
};
