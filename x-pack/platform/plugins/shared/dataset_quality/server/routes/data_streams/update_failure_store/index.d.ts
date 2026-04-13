import type { ElasticsearchClient } from '@kbn/core/server';
import type { UpdateFailureStoreResponse } from '../../../../common/api_types';
export declare function updateFailureStore({ esClient, dataStream, failureStoreEnabled, customRetentionPeriod, isServerless, }: {
    esClient: ElasticsearchClient;
    dataStream: string;
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
    isServerless: boolean;
}): Promise<UpdateFailureStoreResponse>;
