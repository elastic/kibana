import React from 'react';
import type { ApplicationConnections } from '../constants/types';
import type { OAuthConnection } from '../service/application_connections_api_client';
export interface ConnectionsByClientTableProps {
    connections: ApplicationConnections[];
    totalCount: number;
    isLoading: boolean;
    selectedByClient: Record<string, OAuthConnection[]>;
    onSelectionChange: (clientId: string, selection: OAuthConnection[]) => void;
}
export declare const ConnectionsByClientTable: ({ connections, totalCount, isLoading, selectedByClient, onSelectionChange, }: ConnectionsByClientTableProps) => React.JSX.Element;
