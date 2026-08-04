import type { FunctionComponent } from 'react';
import type { OAuthClient, OAuthConnection } from '../service/application_connections_api_client';
export interface ConnectionRowsTableProps {
    client: OAuthClient;
    connections: OAuthConnection[];
    selection: OAuthConnection[];
    onSelectionChange: (selection: OAuthConnection[]) => void;
}
export declare const ConnectionRowsTable: FunctionComponent<ConnectionRowsTableProps>;
