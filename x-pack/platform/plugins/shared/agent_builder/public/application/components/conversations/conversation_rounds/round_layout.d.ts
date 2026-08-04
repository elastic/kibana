import React from 'react';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
interface RoundLayoutProps {
    isCurrentRound: boolean;
    scrollContainerHeight: number;
    rawRound: ConversationRound;
    conversationAttachments?: VersionedAttachment[];
    conversationId?: string;
    allRounds: ConversationRound[];
    roundIndex: number;
}
export declare const RoundLayout: React.FC<RoundLayoutProps>;
export {};
