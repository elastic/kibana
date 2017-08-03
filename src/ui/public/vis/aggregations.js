import { AggTypesIndexProvider } from 'ui/agg_types';

export function AggregationsProvider(Private) {

  const AggTypes = Private(AggTypesIndexProvider);

  /**
   * Enumeration of collections of metric names. Commonly used combinations, suitable for visualizations
   * @type {{DEFAULT_METRICS: *[], DEFAULT_BUCKETS: *[]}}
   */
  const AGGREGATIONS = {

    /**
     * simple metrics, no pipelines
     */
    SIMPLE_METRICS: [
      AggTypes.byName.count.name,
      AggTypes.byName.avg.name,
      AggTypes.byName.sum.name,
      AggTypes.byName.median.name,
      AggTypes.byName.min.name,
      AggTypes.byName.max.name,
      AggTypes.byName.cardinality.name,
      AggTypes.byName.std_dev.name,
      AggTypes.byName.top_hits.name
    ],

    /**
     * simple statistics
     */
    SIMPLE_STAT_METRICS: [
      AggTypes.byName.count.name,
      AggTypes.byName.avg.name,
      AggTypes.byName.sum.name,
      AggTypes.byName.median.name,
      AggTypes.byName.min.name,
      AggTypes.byName.max.name,
      AggTypes.byName.cardinality.name
    ],

    /**
     * includes sibling pipelines
     */
    DEFAULT_METRICS: [
      AggTypes.byName.count.name,
      AggTypes.byName.avg.name,
      AggTypes.byName.sum.name,
      AggTypes.byName.median.name,
      AggTypes.byName.min.name,
      AggTypes.byName.max.name,
      AggTypes.byName.std_dev.name,
      AggTypes.byName.cardinality.name,
      AggTypes.byName.percentiles.name,
      AggTypes.byName.percentile_ranks.name,
      AggTypes.byName.top_hits.name,

      AggTypes.byName.avg_bucket.name,
      AggTypes.byName.sum_bucket.name,
      AggTypes.byName.min_bucket.name,
      AggTypes.byName.max_bucket.name
    ],

    /**
     * includes sibling pipelines
     */
    DEFAULT_METRICS_WITH_PARENT_PIPELINES: [
      AggTypes.byName.count.name,
      AggTypes.byName.avg.name,
      AggTypes.byName.sum.name,
      AggTypes.byName.median.name,
      AggTypes.byName.min.name,
      AggTypes.byName.max.name,
      AggTypes.byName.std_dev.name,
      AggTypes.byName.cardinality.name,
      AggTypes.byName.percentiles.name,
      AggTypes.byName.percentile_ranks.name,
      AggTypes.byName.top_hits.name,
      AggTypes.byName.derivative.name,

      AggTypes.byName.cumulative_sum.name,
      AggTypes.byName.moving_avg.name,
      AggTypes.byName.serial_diff.name,

      AggTypes.byName.avg_bucket.name,
      AggTypes.byName.sum_bucket.name,
      AggTypes.byName.min_bucket.name,
      AggTypes.byName.max_bucket.name
    ],


    /**
     * simple buckets, no geo features
     */
    DEFAULT_BUCKETS: [
      AggTypes.byName.date_histogram.name,
      AggTypes.byName.histogram.name,
      AggTypes.byName.range.name,
      AggTypes.byName.date_range.name,
      AggTypes.byName.ip_range.name,
      AggTypes.byName.terms.name,
      AggTypes.byName.filters.name,
      AggTypes.byName.significant_terms.name
    ]
  };

  return AGGREGATIONS;

}
