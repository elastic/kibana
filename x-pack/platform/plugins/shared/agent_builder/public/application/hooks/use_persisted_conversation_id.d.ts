interface UsePersistedConversationIdParams {
    sessionTag?: string;
    agentId?: string;
}
export declare const usePersistedConversationId: ({ sessionTag, agentId, }: UsePersistedConversationIdParams) => {
    persistedConversationId: string | undefined;
    updatePersistedConversationId: (id?: string) => void;
};
export {};
