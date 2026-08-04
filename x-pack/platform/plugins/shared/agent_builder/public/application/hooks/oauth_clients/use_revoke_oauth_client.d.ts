import type { RevokeOAuthClientResponse } from '../../../../common/http_api/oauth_clients';
interface RevokeOAuthClientVariables {
    clientId: string;
    reason?: string;
}
export declare const useRevokeOAuthClient: () => {
    revokeOAuthClient: import("@tanstack/react-query").UseMutateAsyncFunction<RevokeOAuthClientResponse, Error, RevokeOAuthClientVariables, unknown>;
    isRevoking: boolean;
};
export {};
