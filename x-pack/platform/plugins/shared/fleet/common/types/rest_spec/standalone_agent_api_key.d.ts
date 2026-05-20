import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
export interface PostStandaloneAgentAPIKeyRequest {
    body: {
        name: string;
    };
}
export interface PostStandaloneAgentAPIKeyResponse {
    action: string;
    item: SecurityCreateApiKeyResponse;
}
