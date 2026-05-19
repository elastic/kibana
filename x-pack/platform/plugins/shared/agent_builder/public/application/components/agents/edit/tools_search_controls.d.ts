import React from 'react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
interface ToolsSearchControlsProps {
    displayTools: ToolDefinition[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    showActiveOnly: boolean;
    onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
    disabled: boolean;
}
export declare const ToolsSearchControls: React.FC<ToolsSearchControlsProps>;
export {};
