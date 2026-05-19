import type { estypes } from '@elastic/elasticsearch';
export type DatafeedId = string;
export type Datafeed = estypes.MlDatafeed;
export type ChunkingConfig = estypes.MlChunkingConfig;
export type Aggregation = Record<string, estypes.AggregationsAggregationContainer>;
export type IndicesOptions = estypes.IndicesOptions;
