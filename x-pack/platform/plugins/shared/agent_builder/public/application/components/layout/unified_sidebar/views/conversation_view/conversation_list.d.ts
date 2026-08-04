import React from 'react';
interface ConversationListProps {
    agentId: string;
    currentConversationId: string | undefined;
    isNewConversationRoute: boolean;
    onItemClick?: (conversationId: string) => void;
}
export declare const ConversationList: React.FC<ConversationListProps>;
export {};
