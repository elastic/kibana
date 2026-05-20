import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
interface DeleteComponentOptions {
    esClient: ElasticsearchClient;
    name: string;
    logger: Logger;
}
interface ComponentManagementOptions {
    esClient: ElasticsearchClient;
    component: ClusterPutComponentTemplateRequest;
    logger: Logger;
}
export declare function deleteComponent({ esClient, name, logger }: DeleteComponentOptions): Promise<void>;
export declare function upsertComponent({ esClient, component, logger }: ComponentManagementOptions): Promise<void>;
export {};
