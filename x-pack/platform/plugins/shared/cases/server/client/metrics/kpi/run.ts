/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricResult } from '../../../../common/types/api';
import type { CustomKpiMetricConfiguration } from '../../../../common/types/domain';
import type { CasesAnalyticsV2ReaderContract } from '../../../cases_analytics_v2/reader';
import type { KpiQueryContext, KpiSearchRequest } from './query_builder';
import { buildKpiMetricSearch } from './query_builder';
import { mapKpiSearchResponse, toKpiMetricError } from './result';

interface PlannedSearch {
  position: number;
  metric: CustomKpiMetricConfiguration;
  request: KpiSearchRequest;
}

/**
 * Runs the custom metrics in one msearch. An invalid or failed metric gives an error result for that metric only.
 */
export const runKpiMetrics = async ({
  metrics,
  context,
  reader,
}: {
  metrics: CustomKpiMetricConfiguration[];
  context: KpiQueryContext;
  reader: CasesAnalyticsV2ReaderContract;
}): Promise<KpiMetricResult[]> => {
  const results: KpiMetricResult[] = [];
  const planned: PlannedSearch[] = [];

  metrics.forEach((metric, position) => {
    try {
      planned.push({ position, metric, request: buildKpiMetricSearch(metric, context) });
    } catch (error) {
      results[position] = toKpiMetricError(metric.id, error.message);
    }
  });

  if (planned.length === 0) {
    return results;
  }

  try {
    const responses = await reader.msearch(planned.map(({ request }) => request));

    planned.forEach(({ position, metric }, responseIndex) => {
      results[position] = mapKpiSearchResponse(metric, responses[responseIndex]);
    });
  } catch (error) {
    planned.forEach(({ position, metric }) => {
      results[position] = toKpiMetricError(metric.id, 'The metric search failed.');
    });
  }

  return results;
};
