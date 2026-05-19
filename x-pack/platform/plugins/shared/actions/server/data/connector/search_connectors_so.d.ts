import type { SearchConnectorsSoParams } from './types';
export declare const searchConnectorsSo: ({ esClient, kibanaIndices, aggs, }: SearchConnectorsSoParams) => Promise<import("@elastic/elasticsearch/lib/api/types").SearchResponse<unknown, Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregate>>>;
