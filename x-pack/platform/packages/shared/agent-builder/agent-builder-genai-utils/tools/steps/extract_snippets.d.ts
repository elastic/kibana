import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
export interface TopSnippetsConfig {
    /** Maximum number of snippets per document. */
    numSnippets: number;
    /** Maximum number of words per snippet. */
    numWords: number;
}
/**
 * Extracts top snippets for a batch of documents in a single ES|QL call.
 *
 * The query merges all searchable text fields into one multi-valued field
 * via MV_APPEND, deduplicates with MV_DEDUPE, then applies TOP_SNIPPETS
 * to extract the most relevant fragments.
 *
 * Returns a Map from document ID to an array of unique snippet strings,
 * preserving the order returned by ES|QL (best-matching first).
 */
export declare const extractSnippetsBatch: ({ index, docIds, term, fields, config, esClient, logger, }: {
    index: string;
    docIds: string[];
    term: string;
    fields: MappingField[];
    config: TopSnippetsConfig;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<Map<string, string[]>>;
