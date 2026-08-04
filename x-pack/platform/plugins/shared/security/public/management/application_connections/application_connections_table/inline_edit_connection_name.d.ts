import React from 'react';
import type { OAuthConnection } from '../service/application_connections_api_client';
export interface InlineEditConnectionNameProps {
    clientId: string;
    connection: OAuthConnection;
}
export declare const InlineEditConnectionName: ({ clientId, connection, }: InlineEditConnectionNameProps) => React.JSX.Element;
