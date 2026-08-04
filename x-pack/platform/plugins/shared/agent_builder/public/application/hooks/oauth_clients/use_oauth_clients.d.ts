import type { OAuthClient } from '@kbn/agent-builder-common';
export declare const useOAuthClients: () => {
    clients: OAuthClient[];
    isLoading: boolean;
    error: unknown;
    isFetched: boolean;
};
