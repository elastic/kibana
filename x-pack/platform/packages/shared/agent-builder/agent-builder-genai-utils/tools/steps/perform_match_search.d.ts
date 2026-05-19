import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { type TopSnippetsConfig } from './extract_snippets';
export interface MatchResult {
    id: string;
    index: string;
    snippets: string[];
}
export interface PerformMatchSearchResponse {
    results: MatchResult[];
}
export declare const performMatchSearch: ({ term, fields, index, size, esClient, logger, topSnippetsConfig, }: {
    term: string;
    fields: MappingField[];
    index: string;
    size: number;
    esClient: ElasticsearchClient;
    logger: Logger;
    /** When provided, snippets are extracted via ES|QL TOP_SNIPPETS instead of ES highlighting. */
    topSnippetsConfig?: TopSnippetsConfig;
}) => Promise<PerformMatchSearchResponse>;
