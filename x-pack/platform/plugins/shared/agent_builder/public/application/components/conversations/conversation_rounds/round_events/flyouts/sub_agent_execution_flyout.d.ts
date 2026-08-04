import React from 'react';
interface SubAgentExecutionFlyoutProps {
    executionId: string;
    params?: Record<string, unknown>;
    isCompleted?: boolean;
    onBack?: () => void;
    onClose: () => void;
}
export declare const SubAgentExecutionFlyout: React.FC<SubAgentExecutionFlyoutProps>;
export {};
