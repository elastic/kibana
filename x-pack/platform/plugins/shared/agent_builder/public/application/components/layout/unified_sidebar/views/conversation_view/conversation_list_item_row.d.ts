import React from 'react';
export interface ConversationListItemRowProps {
    agentId: string;
    conversationId: string;
    title: string;
    isActive: boolean;
    routeConversationId: string | undefined;
    showActionsMenu?: boolean;
    onItemClick?: () => void;
}
export declare const ConversationListItemRow: React.FC<ConversationListItemRowProps>;
