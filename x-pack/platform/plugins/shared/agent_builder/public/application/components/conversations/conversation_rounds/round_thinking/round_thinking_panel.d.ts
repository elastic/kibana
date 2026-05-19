import React from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
interface RoundThinkingPanelProps {
    steps: ConversationRoundStep[];
    isLoading: boolean;
    rawRound: ConversationRound;
    onClose: () => void;
}
export declare const RoundThinkingPanel: ({ steps, isLoading, rawRound, onClose, }: RoundThinkingPanelProps) => React.JSX.Element;
export {};
