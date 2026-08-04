import React from 'react';
import type { RevokeApplicationConnectionsModalConnection, RevokedApplicationConnection } from '../constants/types';
import type { OAuthClient } from '../service/application_connections_api_client';
export interface RevokeApplicationConnectionsOptions {
    onRevoked?: (revokedConnections: RevokedApplicationConnection[]) => void;
}
export interface ApplicationConnectionsActionsContextType {
    revokeConnections: (connections: RevokeApplicationConnectionsModalConnection[], options?: RevokeApplicationConnectionsOptions) => void;
    viewClientDetails: (client: OAuthClient) => void;
}
export declare const ApplicationConnectionsProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useApplicationConnectionsActions: () => ApplicationConnectionsActionsContextType;
