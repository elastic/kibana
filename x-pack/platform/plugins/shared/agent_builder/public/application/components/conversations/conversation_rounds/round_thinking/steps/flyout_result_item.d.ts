import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ReactNode } from 'react';
import React from 'react';
interface FlyoutResultItemProps {
    step: ToolCallStep;
    stepIndex: number;
    flyoutResultItems: ToolResult[];
    onOpenFlyout: (results: ToolResult[]) => void;
    icon?: ReactNode;
    textColor?: string;
}
export declare const FlyoutResultItem: React.FC<FlyoutResultItemProps>;
export {};
