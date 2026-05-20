import type { ToolDefinition } from '@kbn/agent-builder-common';
import React from 'react';
export interface ToolQuickActionsProps {
    tool: ToolDefinition;
}
export declare const toolQuickActionsHoverStyles: import("@emotion/react").SerializedStyles;
export declare const ToolQuickActions: ({ tool }: ToolQuickActionsProps) => React.JSX.Element;
