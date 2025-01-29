/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KeyMetric, Metric, EntityDefinition } from '@kbn/entities-schema';
import { getElasticsearchQueryOrThrow } from '../helpers/get_elasticsearch_query_or_throw';
import { InvalidTransformError } from '../errors/invalid_transform_error';

function buildAggregation(metric: Metric, timestampField: string) {
  const { aggregation } = metric;
  switch (aggregation) {
    case 'doc_count':
      return {};
    case 'std_deviation':
      return {
        extended_stats: { field: metric.field },
      };
    case 'percentile':
      if (metric.percentile == null) {
        throw new InvalidTransformError(
          'You must provide a percentile value for percentile aggregations.'
        );
      }
      return {
        percentiles: {
          field: metric.field,
          percents: [metric.percentile],
          keyed: true,
        },
      };
    case 'last_value':
      return {
        top_metrics: {
          metrics: { field: metric.field },
          sort: { [timestampField]: 'desc' },
        },
      };
    default:
      if (metric.field == null) {
        throw new InvalidTransformError('You must provide a field for basic metric aggregations.');
      }
      return {
        [aggregation]: { field: metric.field },
      };
  }
}

function buildMetricAggregations(keyMetric: KeyMetric, timestampField: string) {
  return keyMetric.metrics.reduce((acc, metric) => {
    const filter = metric.filter ? getElasticsearchQueryOrThrow(metric.filter) : { match_all: {} };
    const aggs = { metric: buildAggregation(metric, timestampField) };
    return {
      ...acc,
      [`_${keyMetric.name}_${metric.name}`]: {
        filter,
        ...(metric.aggregation !== 'doc_count' ? { aggs } : {}),
      },
    };
  }, {});
}

function buildBucketPath(prefix: string, metric: Metric) {
  const { aggregation } = metric;
  switch (aggregation) {
    case 'doc_count':
      return `${prefix}>_count`;
    case 'std_deviation':
      return `${prefix}>metric[std_deviation]`;
    case 'percentile':
      return `${prefix}>metric[${metric.percentile}]`;
    case 'last_value':
      return `${prefix}>metric[${metric.field}]`;
    default:
      return `${prefix}>metric`;
  }
}

function convertEquationToPainless(bucketsPath: Record<string, string>, equation: string) {
  const workingEquation = equation || Object.keys(bucketsPath).join(' + ');
  return Object.keys(bucketsPath).reduce((acc, key) => {
    return acc.replaceAll(key, `params.${key}`);
  }, workingEquation);
}

function buildMetricEquation(keyMetric: KeyMetric) {
  const bucketsPath = keyMetric.metrics.reduce(
    (acc, metric) => ({
      ...acc,
      [metric.name]: buildBucketPath(`_${keyMetric.name}_${metric.name}`, metric),
    }),
    {}
  );
  return {
    bucket_script: {
      buckets_path: bucketsPath,
      script: {
        source: convertEquationToPainless(bucketsPath, keyMetric.equation),
        lang: 'painless',
      },
    },
  };
}

export function generateLatestMetricAggregations(definition: EntityDefinition) {
  if (!definition.metrics) {
    return {};
  }
  return definition.metrics.reduce((aggs, keyMetric) => {
    return {
      ...aggs,
      ...buildMetricAggregations(keyMetric, definition.latest.timestampField),
      [`entity.metrics.${keyMetric.name}`]: buildMetricEquation(keyMetric),
    };
  }, {});
}
