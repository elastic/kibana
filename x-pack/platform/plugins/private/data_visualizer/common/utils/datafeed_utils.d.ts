import type { estypes } from '@elastic/elasticsearch';
export type Datafeed = estypes.MlDatafeed;
export type Aggregation = Record<string, estypes.AggregationsAggregationContainer>;
export declare function getAggregations<T>(obj: any): T | undefined;
export declare const getDatafeedAggregations: (datafeedConfig: Partial<Datafeed> | undefined) => Aggregation | undefined;
