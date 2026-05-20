import type { ElasticsearchClient } from '@kbn/core/server';
export declare const deleteComponentTemplates: (esClient: ElasticsearchClient, componentTemplateIds: string[]) => Promise<void>;
