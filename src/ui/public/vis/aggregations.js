import { AggTypesIndexProvider } from 'ui/agg_types';
import _ from 'lodash';

export function AggregationsProvider(Private) {

  const AggTypes = Private(AggTypesIndexProvider);

  const SIMPLE_STAT_METRICS = [
    AggTypes.byName.count.name,
    AggTypes.byName.avg.name,
    AggTypes.byName.sum.name,
    AggTypes.byName.median.name,
    AggTypes.byName.min.name,
    AggTypes.byName.max.name,
    AggTypes.byName.cardinality.name
  ];

  const SIMPLE_MAPPABLE_METRICS = [
    AggTypes.byName.count.name,
    AggTypes.byName.avg.name,
    AggTypes.byName.sum.name,
    AggTypes.byName.median.name,
    AggTypes.byName.min.name,
    AggTypes.byName.max.name,
    AggTypes.byName.cardinality.name,
    AggTypes.byName.top_hits.name
  ];

  const PERCENT_STDEV_DERIV_METRICS = [
    AggTypes.byName.std_dev.name,
    AggTypes.byName.percentiles.name,
    AggTypes.byName.percentile_ranks.name
  ];

  const PARENT_PIPELINE_METRICS = [
    AggTypes.byName.cumulative_sum.name,
    AggTypes.byName.moving_avg.name,
    AggTypes.byName.serial_diff.name
  ];

  const SIBLING_PIPELINES_METRICS = [
    AggTypes.byName.avg_bucket.name,
    AggTypes.byName.sum_bucket.name,
    AggTypes.byName.min_bucket.name,
    AggTypes.byName.max_bucket.name
  ];

  /**
   * Enumeration of collections of metric names. Commonly used combinations, suitable for visualizations
   * @type {{DEFAULT_METRICS: *[], DEFAULT_BUCKETS: *[]}}
   */
  const AGGREGATIONS = {

    SIMPLE_STAT_METRICS: SIMPLE_STAT_METRICS,
    SIMPLE_MAPPABLE_METRICS: SIMPLE_MAPPABLE_METRICS,
    SIMPLE_METRICS: _.union(SIMPLE_MAPPABLE_METRICS, PERCENT_STDEV_DERIV_METRICS),
    DEFAULT_METRICS: _.union(SIMPLE_MAPPABLE_METRICS, PERCENT_STDEV_DERIV_METRICS, SIBLING_PIPELINES_METRICS),
    DEFAULT_METRICS_WITH_PARENT_PIPELINES: _.union(
      SIMPLE_MAPPABLE_METRICS, PERCENT_STDEV_DERIV_METRICS, PARENT_PIPELINE_METRICS, SIBLING_PIPELINES_METRICS
    ),
    TAG_CLOUD_METRICS: _.union(SIMPLE_MAPPABLE_METRICS, PARENT_PIPELINE_METRICS, SIBLING_PIPELINES_METRICS),
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
