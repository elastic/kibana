import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export declare function getConcreteWriteIndex(esClient: {
    asInternalUser: ElasticsearchClient;
}, logger: Logger): Promise<string | undefined>;
export declare function getInferenceIdFromWriteIndex(esClient: {
    asInternalUser: ElasticsearchClient;
}, logger: Logger): Promise<string | undefined>;
