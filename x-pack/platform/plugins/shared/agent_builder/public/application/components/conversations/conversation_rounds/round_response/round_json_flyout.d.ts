import React from 'react';
import type { ConversationRound } from '@kbn/agent-builder-common';
interface RoundJsonFlyoutProps {
    rawRound: ConversationRound;
    onClose: () => void;
}
export declare const RoundJsonFlyout: React.FC<RoundJsonFlyoutProps>;
export {};
