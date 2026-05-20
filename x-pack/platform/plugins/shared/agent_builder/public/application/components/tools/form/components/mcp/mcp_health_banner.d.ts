import React from 'react';
import type { McpToolHealthStatus } from '../../types/mcp';
export interface McpHealthBannerProps {
    status: McpToolHealthStatus;
    onCreateNewTool?: () => void;
    onDeleteTool?: () => void;
    onViewConnectors?: () => void;
    onViewMcpServer?: () => void;
}
export declare const McpHealthBanner: ({ status, onCreateNewTool, onDeleteTool, onViewConnectors, onViewMcpServer, }: McpHealthBannerProps) => React.JSX.Element | null;
