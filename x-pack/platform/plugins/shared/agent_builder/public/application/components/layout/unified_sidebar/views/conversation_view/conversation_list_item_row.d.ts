import React from 'react';
import type { ConversationDisplayStatus } from '@kbn/agent-builder-common';
export interface ConversationListItemRowProps {
    agentId: string;
    conversationId: string;
    title: string;
    isActive: boolean;
    routeConversationId: string | undefined;
    showActionsMenu?: boolean;
    onItemClick?: () => void;
    status?: ConversationDisplayStatus;
    read?: boolean;
}
export declare const ConversationListItemRow: React.FC<ConversationListItemRowProps>;
