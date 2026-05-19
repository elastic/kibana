import React from 'react';
import type { ConversationRound } from '@kbn/agent-builder-common';
interface RawResponseFlyoutProps {
    isOpen: boolean;
    onClose: () => void;
    rawRound: ConversationRound;
}
export declare const RoundFlyout: React.FC<RawResponseFlyoutProps>;
export {};
