import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FeatureWithFilter } from '@kbn/streams-schema';
export declare function fetchSampleDocuments({ esClient, index, start, end, features, logger, size, entityFilteredRatio, diverseRatio, maxEntityFilters, diverseOffset, }: {
    esClient: ElasticsearchClient;
    index: string;
    start: number;
    end: number;
    features: FeatureWithFilter[];
    logger: Logger;
    size: number;
    entityFilteredRatio: number;
    diverseRatio: number;
    diverseOffset?: number;
    maxEntityFilters: number;
}): Promise<{
    documents: SearchHit<Record<string, unknown>>[];
    totalFilters: number;
    filtersCapped: boolean;
    hasFilteredDocuments: boolean;
    nextOffset: number;
}>;
