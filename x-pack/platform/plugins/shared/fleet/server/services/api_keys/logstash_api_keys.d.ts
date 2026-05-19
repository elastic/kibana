import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Check if an esClient has enought permission to create a valid API key for logstash
 *
 * @param esClient
 */
export declare function canCreateLogstashApiKey(esClient: ElasticsearchClient): Promise<boolean>;
/**
 * Generate an Elasticsearch API key to use in logstash ES output
 *
 * @param esClient
 */
export declare function generateLogstashApiKey(esClient: ElasticsearchClient): Promise<import("@elastic/elasticsearch/lib/api/types").SecurityCreateApiKeyResponse>;
