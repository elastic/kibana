import React from 'react';
import type { ConversationRound } from '@kbn/agent-builder-common';
interface RoundResponseActionsProps {
    content: string;
    isVisible: boolean;
    isLastRound?: boolean;
    rawRound?: ConversationRound;
}
export declare const RoundResponseActions: React.FC<RoundResponseActionsProps>;
export {};
