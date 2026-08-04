import React from 'react';
import type { ToolDefinition, ToolSelection } from '@kbn/agent-builder-common';
interface ToolsFlatViewProps {
    tools: ToolDefinition[];
    selectedTools: ToolSelection[];
    onToggleTool: (toolId: string) => void;
    disabled: boolean;
    pageIndex: number;
    onPageChange: (pageIndex: number) => void;
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
    areElasticCapabilitiesEnabled?: boolean;
    defaultToolIdSet?: Set<string>;
}
export declare const ToolsFlatView: React.FC<ToolsFlatViewProps>;
export {};
