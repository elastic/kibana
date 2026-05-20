import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import React from 'react';
interface RoundStepsProps {
    steps: ConversationRoundStep[];
    isLoading: boolean;
}
export declare const RoundSteps: React.FC<RoundStepsProps>;
export {};
