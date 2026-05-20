import type { ElasticsearchClient } from '@kbn/core/server';
export declare const deleteMlModel: (esClient: ElasticsearchClient, mlModelIds: string[]) => Promise<void>;
