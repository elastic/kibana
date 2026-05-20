import React from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
interface RoundThinkingProps {
    rawRound: ConversationRound;
    steps: ConversationRoundStep[];
    isLoading: boolean;
}
export declare const RoundThinking: React.FC<RoundThinkingProps>;
export {};
