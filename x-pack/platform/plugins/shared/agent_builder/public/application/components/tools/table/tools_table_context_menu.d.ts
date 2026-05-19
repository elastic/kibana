import type { ToolDefinition } from '@kbn/agent-builder-common';
import React from 'react';
export interface ToolContextMenuProps {
    tool: ToolDefinition;
}
export declare const ToolContextMenu: ({ tool }: ToolContextMenuProps) => React.JSX.Element;
