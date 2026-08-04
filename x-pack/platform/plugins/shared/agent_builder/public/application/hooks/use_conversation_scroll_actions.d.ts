export declare const useConversationScrollActions: ({ conversationId, scrollContainer, }: {
    conversationId: string;
    scrollContainer: HTMLDivElement | null;
}) => {
    showScrollButton: boolean;
    onMessageSent: () => void;
    smoothScrollToBottom: () => void;
    stickToBottom: () => void;
};
