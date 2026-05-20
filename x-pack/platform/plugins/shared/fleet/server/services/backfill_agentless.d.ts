import type { ElasticsearchClient } from '@kbn/core/server';
export declare function backfillPackagePolicySupportsAgentless(esClient: ElasticsearchClient): Promise<void>;
