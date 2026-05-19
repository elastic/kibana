import type { ResolvedResourceWithSampling } from './resolve_resource_for_esql_with_sampling_stats';
/**
 * Formats a resource with sampled field values as a compact plain-text block,
 * suitable for inclusion in a prompt.
 *
 * Each field is rendered as a single line:
 *   path (type[, ts_dimension][, ts_metric=<metric>]) [description][: val1, val2]
 */
export declare const formatResourceWithSampledValues: ({ resource, }: {
    resource: ResolvedResourceWithSampling;
}) => string;
