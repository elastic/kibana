import type { Tool as McpTool } from '@kbn/mcp-client';
import React from 'react';
import type { McpToolField } from './types';
export interface McpToolsSelectionTableProps {
    tools: readonly McpTool[];
    selectedTools: McpToolField[];
    onChange: (tools: McpTool[]) => void;
    isLoading: boolean;
    isError: boolean;
    isDisabled: boolean;
    disabledMessage?: string;
}
export declare const McpToolsSelectionTable: React.FC<McpToolsSelectionTableProps>;
