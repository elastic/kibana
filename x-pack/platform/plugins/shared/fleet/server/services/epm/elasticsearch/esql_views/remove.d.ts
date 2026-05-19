import type { ElasticsearchClient } from '@kbn/core/server';
export declare function deleteEsqlViews(esClient: ElasticsearchClient, idsToDelete: string[]): Promise<void>;
