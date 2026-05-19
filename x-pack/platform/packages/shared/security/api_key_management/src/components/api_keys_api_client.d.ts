import type { estypes } from '@elastic/elasticsearch';
import type { Criteria } from '@elastic/eui';
import type { QueryContainer } from '@elastic/eui/src/components/search_bar/query/ast_to_es_query_dsl';
import type { HttpStart } from '@kbn/core/public';
import type { ApiKeyToInvalidate, CategorizedApiKey, QueryApiKeyResult } from '@kbn/security-plugin-types-common';
import type { CreateAPIKeyParams, CreateAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult } from '@kbn/security-plugin-types-server';
export type { CreateAPIKeyParams, CreateAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult };
export interface QueryFilters {
    usernames?: string[];
    type?: 'rest' | 'managed' | 'cross_cluster';
    expired?: boolean;
}
export interface InvalidateApiKeysResponse {
    itemsInvalidated: ApiKeyToInvalidate[];
    errors: any[];
}
export type QueryApiKeySortOptions = Required<Criteria<CategorizedApiKey>>['sort'];
export interface QueryApiKeyParams {
    query: QueryContainer;
    size: number;
    sort: QueryApiKeySortOptions;
    filters: QueryFilters;
    searchAfter?: estypes.SortResults;
}
export declare class APIKeysAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    queryApiKeys(params?: QueryApiKeyParams): Promise<QueryApiKeyResult>;
    invalidateApiKeys(apiKeys: ApiKeyToInvalidate[], isAdmin?: boolean): Promise<InvalidateApiKeysResponse>;
    createApiKey(apiKey: CreateAPIKeyParams): Promise<estypes.SecurityCreateApiKeyResponse>;
    updateApiKey(apiKey: UpdateAPIKeyParams): Promise<estypes.SecurityUpdateApiKeyResponse>;
}
