import type { estypes } from '@elastic/elasticsearch';
/**
 * Type guard to validate multi bucket aggregate format.
 *
 * @template TBucket
 * @param {unknown} arg - The item to be checked.
 * @returns {arg is estypes.AggregationsMultiBucketAggregateBase<TBucket>}
 */
export declare const isMultiBucketAggregate: <TBucket = unknown>(arg: unknown) => arg is estypes.AggregationsMultiBucketAggregateBase<TBucket>;
