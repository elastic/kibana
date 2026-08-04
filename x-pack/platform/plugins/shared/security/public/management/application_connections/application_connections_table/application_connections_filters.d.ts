import type { ApplicationConnection, ApplicationConnections, ApplicationConnectionStatusFilter } from '../constants/types';
export declare const getConnectionStatus: ({ client, connection, }: ApplicationConnection) => ApplicationConnectionStatusFilter;
export declare const isRevocable: (applicationConnection: ApplicationConnection) => boolean;
export declare const toApplicationConnectionList: (connections: ApplicationConnections[]) => ApplicationConnection[];
export declare const applicationConnectionsMatchesFreeText: (applicationConnections: ApplicationConnections, query: string) => boolean;
export declare const applicationConnectionMatchesFreeText: (applicationConnection: ApplicationConnection, query: string) => boolean;
export declare const applicationConnectionMatchesStatus: (applicationConnection: ApplicationConnection, statuses: ApplicationConnectionStatusFilter[]) => boolean;
