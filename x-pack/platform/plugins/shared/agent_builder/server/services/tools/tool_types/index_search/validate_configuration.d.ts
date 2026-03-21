import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndexSearchToolConfig } from '@kbn/agent-builder-common/tools';
/**
 * Validates the index_search tool config: ensures the pattern resolves to at least one
 * search source (index, alias, or data stream). Cross-cluster search (CCS) patterns
 * (e.g. cluster:index*) are allowed and passed through to listSearchSources.
 */
export declare const validateConfig: ({ config, esClient, }: {
    config: IndexSearchToolConfig;
    esClient: ElasticsearchClient;
}) => Promise<void>;
