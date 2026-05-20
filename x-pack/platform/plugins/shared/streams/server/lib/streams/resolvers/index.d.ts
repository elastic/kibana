import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamlangResolverOptions } from '@kbn/streamlang/types/resolvers';
export declare const createStreamlangResolverOptions: (esClient: ElasticsearchClient) => StreamlangResolverOptions;
