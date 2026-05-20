import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
interface ToolCallDisplayProps {
    step: ToolCallStep;
    icon?: ReactNode;
    textColor?: string;
}
export declare const ToolCallDisplay: React.FC<ToolCallDisplayProps>;
export {};
