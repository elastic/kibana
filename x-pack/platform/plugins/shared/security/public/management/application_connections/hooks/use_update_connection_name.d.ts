import type { OAuthConnection } from '../service/application_connections_api_client';
export interface UpdateConnectionNameVariables {
    clientId: string;
    connectionId: string;
    name: string;
}
export declare const useUpdateConnectionName: () => {
    updateConnectionName: import("@tanstack/react-query").UseMutateAsyncFunction<OAuthConnection, Error, UpdateConnectionNameVariables, unknown>;
    isUpdating: boolean;
};
