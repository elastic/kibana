import React from 'react';
import type { BackgroundAgentCompleteStep } from '@kbn/agent-builder-common';
interface BackgroundExecutionDisplayProps {
    step: BackgroundAgentCompleteStep;
    onInspect: () => void;
    icon?: React.ReactNode;
    textColor?: string;
}
export declare const BackgroundExecutionDisplay: React.FC<BackgroundExecutionDisplayProps>;
export {};
