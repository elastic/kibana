import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CcrFollowInfoFollowerIndex } from '@elastic/elasticsearch/lib/api/types';
import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';
export declare const getFollowerIndexInfo: (esClient: ElasticsearchClient, logger: Logger) => Promise<{
    info?: CcrFollowInfoFollowerIndex;
    error?: string;
}>;
export declare const fetchAndCompareSyncedIntegrations: (esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, index: string, logger: Logger) => Promise<GetRemoteSyncedIntegrationsStatusResponse>;
export declare const getRemoteSyncedIntegrationsStatus: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract) => Promise<GetRemoteSyncedIntegrationsStatusResponse>;
