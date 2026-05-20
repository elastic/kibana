import React from 'react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
interface ToolLibraryPanelProps {
    onClose: () => void;
    allTools: ToolDefinition[];
    activeToolIdSet: Set<string>;
    onToggleTool: (tool: ToolDefinition, isActive: boolean) => void;
    enableElasticCapabilities?: boolean;
    builtinToolIdSet?: Set<string>;
}
export declare const ToolLibraryPanel: React.FC<ToolLibraryPanelProps>;
export {};
