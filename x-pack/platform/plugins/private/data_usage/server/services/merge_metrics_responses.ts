/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricTypes } from '../../common/rest_types';
import type {
  UsageMetricsAutoOpsResponseMetricSeries,
  UsageMetricsAutoOpsResponseSchemaBody,
} from './autoops_api';

/**
 * Merges the responses of batched AutoOps metrics requests into a single response body.
 *
 * Every batch covers a disjoint set of `allowed_indices` and AutoOps returns one series per data
 * stream (keyed by `name`), so merging is a concatenation of the series per metric type — there is
 * no per-point arithmetic to perform and no series appears in more than one batch.
 */
export function mergeMetricsResponses(
  responses: UsageMetricsAutoOpsResponseSchemaBody[]
): UsageMetricsAutoOpsResponseSchemaBody {
  const merged: UsageMetricsAutoOpsResponseSchemaBody = {};

  for (const response of responses) {
    const entries = Object.entries(response) as Array<
      [MetricTypes, UsageMetricsAutoOpsResponseMetricSeries[] | undefined]
    >;

    for (const [metricType, series] of entries) {
      if (!series?.length) {
        continue;
      }

      const mergedSeries = merged[metricType];

      if (mergedSeries) {
        mergedSeries.push(...series);
      } else {
        merged[metricType] = [...series];
      }
    }
  }

  return merged;
}
