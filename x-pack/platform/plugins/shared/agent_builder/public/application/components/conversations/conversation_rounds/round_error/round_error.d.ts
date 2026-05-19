import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
interface RoundErrorProps {
    error: unknown;
    errorSteps: ConversationRoundStep[];
    onRetry: () => void;
}
export declare const RoundError: React.FC<RoundErrorProps>;
export {};
