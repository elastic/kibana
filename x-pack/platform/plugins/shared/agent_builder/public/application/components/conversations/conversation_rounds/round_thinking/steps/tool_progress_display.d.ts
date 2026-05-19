import type { ToolCallProgress } from '@kbn/agent-builder-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
interface ToolProgressDisplayProps {
    progress: ToolCallProgress;
    icon?: ReactNode;
    textColor?: string;
}
export declare const ToolProgressDisplay: React.FC<ToolProgressDisplayProps>;
export {};
