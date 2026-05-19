import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';
import type { EnrollmentAPIKey } from '../../types';
export declare function listEnrollmentApiKeys(esClient: ElasticsearchClient, options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    query?: ReturnType<typeof toElasticsearchQuery>;
    showInactive?: boolean;
    spaceId?: string;
}): Promise<{
    items: EnrollmentAPIKey[];
    total: any;
    page: any;
    perPage: any;
}>;
export declare function hasEnrollementAPIKeysForPolicy(esClient: ElasticsearchClient, policyId: string): Promise<boolean>;
export declare function getEnrollmentAPIKey(esClient: ElasticsearchClient, id: string, spaceId?: string): Promise<EnrollmentAPIKey>;
/**
 * forceDelete=false (revoke): invalidate the ES API key and set active=false on the enrollment token document.
 * forceDelete=true (delete): invalidate the ES API key and delete the enrollment token document from the index.
 */
export declare function deleteEnrollmentApiKeys(esClient: ElasticsearchClient, ids: string[], forceDelete?: boolean, spaceId?: string, includeHidden?: boolean): Promise<{
    successCount: number;
    errorCount: number;
}>;
export declare function deleteEnrollmentApiKeyForAgentPolicyId(esClient: ElasticsearchClient, agentPolicyId: string): Promise<void>;
export declare function bulkDeleteEnrollmentApiKeys(esClient: ElasticsearchClient, options: {
    tokenIds?: string[];
    kuery?: string;
    forceDelete?: boolean;
    spaceId?: string;
    includeHidden?: boolean;
}): Promise<{
    count: number;
    successCount: number;
    errorCount: number;
}>;
export declare function generateEnrollmentAPIKey(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, data: {
    name?: string;
    expiration?: string;
    agentPolicyId: string;
    forceRecreate?: boolean;
}): Promise<EnrollmentAPIKey>;
export declare function ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentPolicyId: string): Promise<EnrollmentAPIKey | undefined>;
export declare function getEnrollmentAPIKeyById(esClient: ElasticsearchClient, apiKeyId: string): Promise<EnrollmentAPIKey>;
