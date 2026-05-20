import type { EnrichSummary } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EnrichPolicyResolverMetadata, EnrichPolicyResolver } from '@kbn/streamlang/types/resolvers';
export declare const mapEnrichSummaryToMetadata: (summary: EnrichSummary) => EnrichPolicyResolverMetadata | null;
/**
 * Resolves enrich policy metadata from Elasticsearch for Streamlang ingest transpilation.
 */
export declare const createEnrichPolicyResolver: (esClient: ElasticsearchClient) => EnrichPolicyResolver;
