import type { ElasticsearchClient } from '@kbn/core/server';
export declare function ensureCorrectAgentlessSettingsIds(esClient: ElasticsearchClient): Promise<void>;
