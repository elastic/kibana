import type { ToolDefinition } from '@kbn/agent-builder-common';
import React from 'react';
export interface ToolsTableHeaderProps {
    isLoading: boolean;
    pageIndex: number;
    tools: ToolDefinition[];
    total: number;
    selectedTools: ToolDefinition[];
    setSelectedTools: (tools: ToolDefinition[]) => void;
}
export declare const ToolsTableHeader: ({ isLoading, pageIndex, tools, total, selectedTools, setSelectedTools, }: ToolsTableHeaderProps) => React.JSX.Element;
