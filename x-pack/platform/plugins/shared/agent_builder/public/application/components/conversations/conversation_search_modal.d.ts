import React from 'react';
interface ConversationSearchModalProps {
    agentId: string;
    currentConversationId?: string;
    onClose: () => void;
    onSelectConversation: (conversationId: string) => void;
}
export declare const ConversationSearchModal: React.FC<ConversationSearchModalProps>;
export {};
