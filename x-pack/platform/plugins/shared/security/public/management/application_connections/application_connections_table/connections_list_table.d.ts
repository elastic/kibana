import React from 'react';
import type { ApplicationConnection } from '../constants/types';
import type { OAuthConnection } from '../service/application_connections_api_client';
export interface ConnectionsListTableProps {
    connections: ApplicationConnection[];
    totalCount: number;
    isLoading: boolean;
    selectedConnections: OAuthConnection[];
    onSelectionChange: (selection: OAuthConnection[]) => void;
}
export declare const ConnectionsListTable: ({ connections, totalCount, isLoading, selectedConnections, onSelectionChange, }: ConnectionsListTableProps) => React.JSX.Element;
