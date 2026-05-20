import type { ElasticsearchClient } from '@kbn/core/server';
export declare const deleteIlms: (esClient: ElasticsearchClient, ilmPolicyIds: string[]) => Promise<void>;
