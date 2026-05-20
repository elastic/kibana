export declare const useConversationScrollActions: ({ isResponseLoading, conversationId, scrollContainer, }: {
    isResponseLoading: boolean;
    conversationId: string;
    scrollContainer: HTMLDivElement | null;
}) => {
    showScrollButton: boolean;
    scrollToMostRecentRoundTop: () => void;
    smoothScrollToBottom: () => void;
    stickToBottom: () => void;
};
