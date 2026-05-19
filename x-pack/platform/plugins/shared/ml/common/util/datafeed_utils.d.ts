import type { Aggregation } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
export declare function getAggregations<T>(obj: any): T | undefined;
export declare const getDatafeedAggregations: (datafeedConfig: Partial<Datafeed> | undefined) => Aggregation | undefined;
export declare function getIndicesOptions(datafeedConfig?: Datafeed): Pick<import("@elastic/elasticsearch/lib/api/types").IndicesOptions, "allow_no_indices" | "expand_wildcards" | "ignore_unavailable">;
