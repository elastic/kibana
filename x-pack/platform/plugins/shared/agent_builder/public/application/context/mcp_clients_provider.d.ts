import React from 'react';
import { type McpClientDetailsData, type McpClientDetailsPresentation } from '@kbn/agent-builder-browser';
export interface McpClientsActionsContextType {
    createMcpClient: () => void;
    revokeMcpClient: (clientId: string, clientName: string, connectionCount: number) => void;
    viewClientDetails: (clientDetails: McpClientDetailsData, presentation: McpClientDetailsPresentation) => void;
}
export declare const McpClientsProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useMcpClientsActions: () => McpClientsActionsContextType;
