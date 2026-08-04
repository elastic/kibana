import type { BulkRevokeConnectionsResponse, BulkRevokeConnectionTarget } from '../service/application_connections_api_client';
interface RevokeConnectionsVariables {
    connections: BulkRevokeConnectionTarget[];
    reason?: string;
}
export declare const useRevokeConnections: () => {
    revokeConnections: import("@tanstack/react-query").UseMutateAsyncFunction<BulkRevokeConnectionsResponse, Error, RevokeConnectionsVariables, unknown>;
    isRevoking: boolean;
};
export {};
