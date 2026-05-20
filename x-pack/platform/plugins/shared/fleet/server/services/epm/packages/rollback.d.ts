import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { BulkRollbackAvailableCheckResponse, RollbackAvailableCheckResponse } from '../../../../common/types';
export declare const isIntegrationRollbackTTLExpired: (installStartedAt: string) => boolean;
export declare function rollbackAvailableCheck(pkgName: string, currentUserPolicyIds: string[]): Promise<RollbackAvailableCheckResponse>;
export declare function bulkRollbackAvailableCheck(request: KibanaRequest): Promise<BulkRollbackAvailableCheckResponse>;
export declare function rollbackInstallation(options: {
    esClient: ElasticsearchClient;
    currentUserPolicyIds: string[];
    pkgName: string;
    spaceId: string;
}): Promise<{
    version: string;
    success: boolean;
}>;
