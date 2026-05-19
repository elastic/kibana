import type { ElasticsearchClient } from '@kbn/core/server';
import type { TaggingUsageData } from './types';
export declare const fetchTagUsageData: ({ esClient, kibanaIndices, }: {
    esClient: ElasticsearchClient;
    kibanaIndices: string[];
}) => Promise<TaggingUsageData>;
