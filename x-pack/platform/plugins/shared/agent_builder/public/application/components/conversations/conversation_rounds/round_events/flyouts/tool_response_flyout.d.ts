import React from 'react';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
interface ToolResponseFlyoutProps {
    step: ToolCallStepData;
    onClose: () => void;
    onBack?: () => void;
}
export declare const ToolResponseFlyout: React.FC<ToolResponseFlyoutProps>;
export {};
