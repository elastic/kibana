import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
export interface MatchResult {
    id: string;
    index: string;
    highlights: string[];
}
export interface PerformMatchSearchResponse {
    results: MatchResult[];
}
export declare const performMatchSearch: ({ term, fields, index, size, esClient, logger, }: {
    term: string;
    fields: MappingField[];
    index: string;
    size: number;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<PerformMatchSearchResponse>;
