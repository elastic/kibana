import type { CreateOAuthClientPayload, CreateOAuthClientResponse } from '../../../../common/http_api/oauth_clients';
export declare const useCreateOAuthClient: () => {
    createOAuthClient: import("@tanstack/react-query").UseMutateAsyncFunction<CreateOAuthClientResponse, Error, CreateOAuthClientPayload, unknown>;
    isCreating: boolean;
};
