import React from 'react';
export interface McpClientActionsMenuProps {
    clientId: string;
    clientName: string;
    connectionCount: number;
    revoked: boolean;
}
export declare const McpClientActionsMenu: ({ clientId, clientName, connectionCount, revoked, }: McpClientActionsMenuProps) => React.JSX.Element;
