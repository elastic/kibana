import type { OAuthClient } from '@kbn/agent-builder-common';
import React from 'react';
export interface McpClientsTableHeaderProps {
    isLoading: boolean;
    pageIndex: number;
    pageSize: number;
    clients: OAuthClient[];
    total: number;
}
export declare const McpClientsTableHeader: ({ isLoading, pageIndex, pageSize, clients, total, }: McpClientsTableHeaderProps) => React.JSX.Element;
