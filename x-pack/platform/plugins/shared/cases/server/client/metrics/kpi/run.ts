/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KpiMetricResult } from '../../../../common/types/api';
import type { CustomKpiMetricConfiguration } from '../../../../common/types/domain';
import type { CasesAnalyticsV2ReaderContract } from '../../../cases_analytics_v2/reader';
import { getPreviousPeriod } from './period';
import type { KpiQueryContext, KpiSearchRequest } from './query_builder';
import { buildKpiMetricSearch } from './query_builder';
import { mapKpiSearchResponse, readKpiMetricValue, toKpiMetricError } from './result';

interface PlannedSearch {
  position: number;
  metric: CustomKpiMetricConfiguration;
  request: KpiSearchRequest;
  previousRequest?: KpiSearchRequest;
}

const readPreviousValue = (
  metric: CustomKpiMetricConfiguration,
  response: estypes.MsearchResponseItem | undefined
): number | null => {
  if (response == null || 'error' in response) {
    return null;
  }

  return readKpiMetricValue(metric, response);
};

/**
 * Runs the custom metrics in one msearch. An invalid or failed metric gives an error result for that metric only.
 * When the range has a start, each metric also runs for the period of equal length directly before.
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
  const previousPeriod = getPreviousPeriod(context);

  metrics.forEach((metric, position) => {
    try {
      planned.push({
        position,
        metric,
        request: buildKpiMetricSearch(metric, context),
        ...(previousPeriod != null && {
          previousRequest: buildKpiMetricSearch(metric, { ...context, ...previousPeriod }),
        }),
      });
    } catch (error) {
      results[position] = toKpiMetricError(metric.id, error.message);
    }
  });

  if (planned.length === 0) {
    return results;
  }

  const previousRequests = planned.flatMap(({ previousRequest }) =>
    previousRequest != null ? [previousRequest] : []
  );

  try {
    const responses = await reader.msearch([
      ...planned.map(({ request }) => request),
      ...previousRequests,
    ]);

    planned.forEach(({ position, metric }, responseIndex) => {
      const result = mapKpiSearchResponse(metric, responses[responseIndex]);

      results[position] =
        previousRequests.length > 0 && result.type === 'value'
          ? {
              ...result,
              previousValue: readPreviousValue(metric, responses[planned.length + responseIndex]),
            }
          : result;
    });
  } catch (error) {
    planned.forEach(({ position, metric }) => {
      results[position] = toKpiMetricError(metric.id, 'The metric search failed.');
    });
  }

  return results;
};
